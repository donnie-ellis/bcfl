create or replace function begin_transaction()
returns void as $$
begin
  execute 'begin';
end;
$$ language plpgsql;

create or replace function commit_transaction()
returns void as $$
begin
  execute 'commit';
end;
$$ language plpgsql;

create or replace function rollback_transaction()
returns void as $$
begin
  execute 'rollback';
end;
$$ language plpgsql;