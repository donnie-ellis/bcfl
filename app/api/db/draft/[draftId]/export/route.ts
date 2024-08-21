// ./app/api/db/draft/[draftId]/export/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerAuthSession } from "@/auth";
import { createObjectCsvStringifier } from 'csv-writer';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { League } from '@/lib/types/league.types';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function GET(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  const { draftId } = params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  // Check if the user is authenticated
  const session = await getServerAuthSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch draft information
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('*, leagues(*)')
      .eq('id', draftId)
      .single();

    if (draftError) throw draftError;

    // Fetch draft picks with player and team information
    const { data: picks, error: picksError } = await supabase
      .from('picks')
      .select(`
        round_number,
        pick_number,
        total_pick_number,
        players (
          full_name,
          display_position,
          editorial_team_abbr
        ),
        teams (
          name,
          team_logos
        )
      `)
      .eq('draft_id', draftId)
      .order('total_pick_number', { ascending: true });

    if (picksError) throw picksError;

    if (type === 'csv') {
      return handleCSVExport(picks);
    } else if (type === 'pdf') {
      return handlePDFExport(draft, picks);
    } else {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error exporting draft:', error);
    return NextResponse.json({ error: 'Failed to export draft' }, { status: 500 });
  }
}

function handleCSVExport(picks: any[]) {
  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'round', title: 'Round' },
      { id: 'pick', title: 'Pick' },
      { id: 'total_pick', title: 'Total Pick' },
      { id: 'player_name', title: 'Player Name' },
      { id: 'position', title: 'Position' },
      { id: 'team', title: 'NFL Team' },
      { id: 'fantasy_team', title: 'Fantasy Team' },
    ],
  });

  const csvData = picks.map((pick) => ({
    round: pick.round_number,
    pick: pick.pick_number,
    total_pick: pick.total_pick_number,
    player_name: pick.players?.full_name || 'N/A',
    position: pick.players?.display_position || 'N/A',
    team: pick.players?.editorial_team_abbr || 'N/A',
    fantasy_team: pick.teams?.name || 'N/A',
  }));

  const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(csvData);

  return new NextResponse(csvString, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=draft_export.csv',
    },
  });
}

async function handlePDFExport(draft: any, picks: any[]) {
  const doc = new jsPDF();
  const league: League = draft.leagues;

  // Add league name and draft name
  doc.setFontSize(20);
  doc.text(league.name, 14, 15);
  doc.setFontSize(16);
  doc.text(draft.name, 14, 25);

  // Prepare data for the table
  const tableData = picks.map(pick => [
    pick.round_number,
    pick.pick_number,
    pick.players?.full_name || 'N/A',
    pick.players?.display_position || 'N/A',
    pick.players?.editorial_team_abbr || 'N/A',
    pick.teams?.name || 'N/A'
  ]);

  // Generate the table
  autoTable(doc, {
    head: [['Round', 'Pick', 'Player', 'Position', 'NFL Team', 'Fantasy Team']],
    body: tableData,
    startY: 35,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 2,
      textColor: [0, 0, 0] // Ensure text is always black
    },
    headStyles: {
      fillColor: [200, 220, 255], // Light blue header
      textColor: [0, 0, 0], // Black text for header
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 20 },
      2: { cellWidth: 40 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 40 }
    },
    didParseCell: (data) => {
      // Add alternating background color for rounds
      if (data.section === 'body') {
        const row = data.row.index;
        const roundNumber = tableData[row][0];
        if (roundNumber % 2 === 0) {
          data.cell.styles.fillColor = [240, 240, 240]; // Light gray for even rounds
        } else {
          data.cell.styles.fillColor = [255, 255, 255]; // White for odd rounds
        }
      }
    }
  });

  // Convert the PDF to a buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=draft_export.pdf',
    },
  });
}