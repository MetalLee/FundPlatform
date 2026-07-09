export const locales = ["zh", "en"] as const
export type Locale = (typeof locales)[number]

export function hasLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}

const zh = {
  common: {
    appName: "Fund Platform",
    dashboard: "仪表盘",
    home: "首页",
    language: "语言",
    chinese: "中文",
    english: "English",
  },
  home: {
    badge: "私募基金运营",
    title: "用一个运营视图管理资金工作流。",
    description:
      "跟踪出资承诺、监控资金部署，并让投资人相关活动随时可供复核。",
    openDashboard: "打开仪表盘",
    reviewFunds: "查看基金",
    snapshotTitle: "平台概览",
    snapshotDescription: "本季度核心运营信号。",
    footerLeft: "Fund Platform 启动工作区",
    footerRight: "按 d 切换深色模式",
    snapshot: [
      { label: "监控资产", value: "$128.4M" },
      { label: "资金部署", value: "72%" },
      { label: "合规检查", value: "18" },
    ],
  },
  dashboard: {
    badge: "仪表盘",
    title: "基金运营",
    description: "监控资金活动、部署进度和基金级运营状态。",
    metrics: [
      {
        label: "认缴资本",
        value: "$184.2M",
        detail: "较上季度增长 8.4%",
      },
      {
        label: "资产净值",
        value: "$128.4M",
        detail: "覆盖 6 支活跃基金",
      },
      {
        label: "预计 IRR",
        value: "14.8%",
        detail: "当前加权预测",
      },
    ],
    fundProgressTitle: "基金进度",
    fundProgressDescription: "各基金目标对应的部署进度。",
    recentActivityTitle: "近期活动",
    recentActivityDescription: "需要运营关注的最新基金事件。",
    deployedOf: "已部署，共",
    table: {
      date: "日期",
      event: "事件",
      fund: "基金",
      amount: "金额",
    },
    funds: [
      {
        name: "成长基金一期",
        status: "部署中",
        target: "$80M",
        deployed: "$58M",
        progress: 72,
      },
      {
        name: "收益基金二期",
        status: "报告中",
        target: "$45M",
        deployed: "$39M",
        progress: 87,
      },
      {
        name: "机会型 SPV",
        status: "募集中",
        target: "$30M",
        deployed: "$8M",
        progress: 27,
      },
    ],
    activity: [
      {
        date: "7月8日",
        event: "发起资本催缴",
        fund: "成长基金一期",
        amount: "$4.2M",
      },
      {
        date: "7月5日",
        event: "季度报告已审批",
        fund: "收益基金二期",
        amount: "-",
      },
      {
        date: "7月1日",
        event: "投资人认购",
        fund: "机会型 SPV",
        amount: "$1.6M",
      },
    ],
  },
}

const en: typeof zh = {
  common: {
    appName: "Fund Platform",
    dashboard: "Dashboard",
    home: "Home",
    language: "Language",
    chinese: "中文",
    english: "English",
  },
  home: {
    badge: "Private fund operations",
    title: "Capital workflows in one operational view.",
    description:
      "Track commitments, monitor deployment, and keep investor-facing activity ready for review.",
    openDashboard: "Open dashboard",
    reviewFunds: "Review funds",
    snapshotTitle: "Platform snapshot",
    snapshotDescription: "Core operating signals for the current quarter.",
    footerLeft: "Fund Platform starter workspace",
    footerRight: "Press d to toggle dark mode",
    snapshot: [
      { label: "Assets monitored", value: "$128.4M" },
      { label: "Capital deployed", value: "72%" },
      { label: "Compliance checks", value: "18" },
    ],
  },
  dashboard: {
    badge: "Dashboard",
    title: "Fund operations",
    description:
      "Monitor capital activity, deployment progress, and fund-level operating status.",
    metrics: [
      {
        label: "Committed capital",
        value: "$184.2M",
        detail: "+8.4% quarter over quarter",
      },
      {
        label: "Net asset value",
        value: "$128.4M",
        detail: "Across 6 active funds",
      },
      {
        label: "Projected IRR",
        value: "14.8%",
        detail: "Weighted current forecast",
      },
    ],
    fundProgressTitle: "Fund progress",
    fundProgressDescription: "Deployment against each fund target.",
    recentActivityTitle: "Recent activity",
    recentActivityDescription:
      "Latest fund events requiring operational awareness.",
    deployedOf: "deployed of",
    table: {
      date: "Date",
      event: "Event",
      fund: "Fund",
      amount: "Amount",
    },
    funds: [
      {
        name: "Growth Fund I",
        status: "Deploying",
        target: "$80M",
        deployed: "$58M",
        progress: 72,
      },
      {
        name: "Income Fund II",
        status: "Reporting",
        target: "$45M",
        deployed: "$39M",
        progress: 87,
      },
      {
        name: "Opportunity SPV",
        status: "Raising",
        target: "$30M",
        deployed: "$8M",
        progress: 27,
      },
    ],
    activity: [
      {
        date: "Jul 08",
        event: "Capital call issued",
        fund: "Growth Fund I",
        amount: "$4.2M",
      },
      {
        date: "Jul 05",
        event: "Quarterly report approved",
        fund: "Income Fund II",
        amount: "-",
      },
      {
        date: "Jul 01",
        event: "Investor subscription",
        fund: "Opportunity SPV",
        amount: "$1.6M",
      },
    ],
  },
}

const dictionaries = { zh, en }

export function getDictionary(locale: Locale) {
  return dictionaries[locale]
}
