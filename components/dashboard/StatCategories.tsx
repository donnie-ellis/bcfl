// ./components/StatCategories.tsx
import React from 'react';

import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';

import { Json, parseStatCategories } from '@/lib/types';

const StatCategories: React.FC<{ categories: Json }> = ({ categories }) => {
    const parsedCategories = parseStatCategories(categories);
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Points</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {parsedCategories.map((cat, index) => {
                    let displayValue = 'N/A';
                    if (cat.value !== null && cat.value !== undefined) {
                        if (cat.name.toLowerCase().includes('yards') || cat.name.toLowerCase().includes('yds')) {
                            displayValue = `${Math.round(1 / cat.value)} "${cat.display_name}" = 1 point`;
                        } else {
                            displayValue = Math.round(cat.value).toString();
                        }
                    }
                    return (
                        <TableRow key={index}>
                            <TableCell>{cat.display_name}</TableCell>
                            <TableCell>{displayValue}</TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    )
}

export default StatCategories;