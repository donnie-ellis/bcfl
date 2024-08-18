# ADP
## https://fantasyfootballcalculator.com
https://fantasyfootballcalculator.com/api/v1/adp/standard?teams=10&year=2024&position=all  
### Example data
```
{
    "status": "Success",
    "meta": {
        "type": "PPR",
        "teams": 10,
        "rounds": 15,
        "total_drafts": 1587,
        "start_date": "2024-08-06",
        "end_date": "2024-08-08"
    },
    "players": [
        {
            "player_id": 2434,
            "name": "Christian McCaffrey",
            "position": "RB",
            "team": "SF",
            "adp": 1.3,
            "adp_formatted": "1.01",
            "times_drafted": 351,
            "high": 1,
            "low": 4,
            "stdev": 0.6,
            "bye": 9
        }
    ]
}
```


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

# Supabase
## Useful commands
### Dump
`supabase db dump --db-url postgresql://postgres:postgres@127.0.0.1:54322/postgres > ../db.sql`
### Migrations
#### Create migration
`supabase migration new name`  
#### Apply migration
`supabase migration up`  
#### Push migrations to remote
`supabase db push`  