insert into public.tracked_funds (
  user_id,
  fund_code,
  fund_name,
  fund_type,
  manager,
  company,
  latest_nav,
  latest_nav_date,
  latest_nav_change_pct,
  source,
  last_synced_at
) values
  (
    null,
    '000001',
    '成长精选混合',
    '混合型',
    '示例基金经理',
    '示例基金公司',
    1.2834,
    '2026-07-09',
    1.82,
    'seed',
    now()
  ),
  (
    null,
    '000002',
    '稳健收益债券',
    '债券型',
    '示例基金经理',
    '示例基金公司',
    1.0568,
    '2026-07-09',
    -0.24,
    'seed',
    now()
  )
on conflict (user_id, fund_code) do nothing;

insert into public.fund_holdings (
  fund_code,
  report_period,
  asset_type,
  market,
  symbol,
  name,
  weight_pct,
  shares,
  market_value,
  source,
  source_report_date
) values
  ('000001', '2026Q2', 'equity', 'CN', '600519', '贵州茅台', 8.52, null, null, 'seed', '2026-06-30'),
  ('000001', '2026Q2', 'equity', 'CN', '300750', '宁德时代', 6.18, null, null, 'seed', '2026-06-30'),
  ('000001', '2026Q2', 'equity', 'CN', '600036', '招商银行', 4.73, null, null, 'seed', '2026-06-30')
on conflict (fund_code, report_period, symbol) do nothing;

insert into public.market_quotes (
  market,
  symbol,
  name,
  price,
  previous_close,
  change_pct,
  currency,
  quote_time,
  source,
  raw
) values
  ('CN', '600519', '贵州茅台', 1688.00, 1677.60, 0.62, 'CNY', now(), 'seed', '{}'::jsonb),
  ('CN', '300750', '宁德时代', 212.40, 214.76, -1.10, 'CNY', now(), 'seed', '{}'::jsonb),
  ('CN', '600036', '招商银行', 38.20, 38.20, 0.00, 'CNY', now(), 'seed', '{}'::jsonb)
on conflict (market, symbol) do nothing;

insert into public.user_positions (
  user_id,
  fund_code,
  holding_amount,
  holding_shares,
  cost_amount,
  daily_invest_amount,
  note
) values
  (null, '000001', 50000, 38958.63, 48000, 100, 'seed sample position'),
  (null, '000002', 30000, 28387.58, 30000, 50, 'seed sample position')
on conflict (user_id, fund_code) do nothing;

insert into public.estimate_snapshots (
  user_id,
  fund_code,
  estimate_date,
  estimated_change_pct,
  estimated_profit_amount,
  covered_weight_pct,
  top_contributors,
  warnings
) values
  (
    null,
    '000001',
    '2026-07-09',
    1.82,
    910.00,
    19.43,
    '[{"symbol":"600519","name":"贵州茅台","contribution_pct":0.052}]'::jsonb,
    '["seed data only"]'::jsonb
  )
on conflict (user_id, fund_code, estimate_date) do nothing;

insert into public.insight_sources (
  user_id,
  title,
  source_type,
  url,
  content,
  related_markets,
  related_symbols,
  related_fund_codes,
  sentiment,
  importance
) values
  (
    null,
    '示例市场洞察',
    'manual',
    null,
    '仅用于初始化本地开发数据。',
    array['CN'],
    array['600519', '300750'],
    array['000001'],
    'neutral',
    3
  );
