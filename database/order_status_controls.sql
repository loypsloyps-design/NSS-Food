grant update(status) on public.orders to authenticated;
create policy member_status_update on public.orders for update to authenticated using (exists(select 1 from public.restaurant_members m where m.restaurant_id=orders.restaurant_id and m.user_id=(select auth.uid()))) with check (exists(select 1 from public.restaurant_members m where m.restaurant_id=orders.restaurant_id and m.user_id=(select auth.uid())));
create function public.validate_order_status() returns trigger language plpgsql security invoker set search_path='' as $$ begin
if new.status=old.status then return new; end if;
if not ((old.status='new' and new.status in ('confirmed','cancelled')) or (old.status='confirmed' and new.status in ('preparing','cancelled')) or (old.status='preparing' and new.status in ('delivering','cancelled')) or (old.status='delivering' and new.status='delivered')) then raise exception 'Invalid order status transition'; end if;
return new; end; $$;
revoke execute on function public.validate_order_status() from public,anon,authenticated;
create trigger validate_order_status before update of status on public.orders for each row execute function public.validate_order_status();