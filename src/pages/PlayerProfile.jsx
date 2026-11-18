import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import {
  ArrowLeft,
  Activity,
  Target,
  Trophy,
  TrendingUp,
  ShieldCheck,
  BarChart3,
  Gauge,
} from 'lucide-react'
import './PlayerProfile.css'

const playerImages = {
  batting: {
    'Naman Dhir': ['naman-dhir.png', '🇮🇳', 'India'],
    'Dhruv Jurel': ['dhruv-jurel.png', '🇮🇳', 'India'],
    'Dinesh Karthik': ['dinesh-karthik.png', '🇮🇳', 'India'],
    'Ashutosh Sharma': ['ashutosh-sharma.png', '🇮🇳', 'India'],
    'Tim David': ['tim-david.png', '🇦🇺', 'Australia'],
    'Sikandar Raza': ['sikandar-raza.png', '🇿🇼', 'Zimbabwe'],
    'Aiden Markram': ['aiden-markram.png', '🇿🇦', 'South Africa'],
    'Suryakumar Yadav': ['suryakumar-yadav.png', '🇮🇳', 'India'],
    'Jitesh Sharma': ['jitesh-sharma.png', '🇮🇳', 'India'],
    'Namboori Tilak Varma': ['tilak-varma.png', '🇮🇳', 'India'],
  },
  bowling: {
    'Abrar Ahmed': ['abrar-ahmed.png', '🇵🇰', 'Pakistan'],
    'Mohammad Nawaz': ['mohammad-nawaz.png', '🇵🇰', 'Pakistan'],
    'Sunil Narine': ['sunil-narine.png', '🌴', 'West Indies'],
    'Jasprit Bumrah': ['jasprit-bumrah.png', '🇮🇳', 'India'],
    'Akeal Hosein': ['akeal-hosein.png', '🌴', 'West Indies'],
    'Mustafizur Rahman': ['mustafizur-rahman.png', '🇧🇩', 'Bangladesh'],
    'Mohammad Wasim': ['mohammad-wasim.png', '🇵🇰', 'Pakistan'],
    'Jamie Overton': ['jamie-overton.png', '🏴', 'England'],
    'Shadab Khan': ['shadab-khan.png', '🇵🇰', 'Pakistan'],
    'Salman Mirza': ['salman-mirza.png', '🇵🇰', 'Pakistan'],
  },
}

const PROFILE_METRICS = {
  batting: [
    { key: 'runs_above_average_per_100_balls', label: 'Runs above baseline', short: 'Baseline runs', higher: true },
    { key: 'pressure_strike_rate', label: 'Pressure strike rate', short: 'Strike rate', higher: true },
    { key: 'pressure_average', label: 'Pressure batting average', short: 'Batting avg.', higher: true },
    { key: 'pressure_dot_ball_pct', label: 'Pressure dot-ball %', short: 'Dot-ball %', higher: false },
    { key: 'pressure_matches', label: 'Pressure matches', short: 'Matches', higher: true },
  ],
  bowling: [
    { key: 'runs_saved_per_6_balls', label: 'Runs saved / 6 balls', short: 'Runs saved', higher: true },
    { key: 'pressure_economy', label: 'Pressure economy', short: 'Economy', higher: false },
    { key: 'pressure_bowling_average', label: 'Pressure bowling average', short: 'Bowling avg.', higher: false },
    { key: 'pressure_wickets', label: 'Pressure wickets', short: 'Wickets', higher: true },
    { key: 'pressure_dot_ball_pct', label: 'Pressure dot-ball %', short: 'Dot-ball %', higher: true },
  ],
}

function parseCSVLine(line) {
  const values = []
  let value = ''
  let quoted = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"' && line[i + 1] === '"' && quoted) {
      value += '"'
      i++
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      values.push(value.trim())
      value = ''
    } else {
      value += char
    }
  }

  values.push(value.trim())
  return values
}

function parseCSV(csv) {
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])

  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCSVLine(line)
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ''])
    )
  })
}

function numeric(value) {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

function formatValue(value, digits = 2) {
  if (value === undefined || value === null || value === '') return '—'
  const result = Number(value)
  return Number.isFinite(result) ? result.toFixed(digits) : value
}

function hasNumericValue(value) {
  return value !== undefined &&
    value !== null &&
    String(value).trim() !== '' &&
    Number.isFinite(Number(value))
}

function normalizeMetric(value, metric, rows) {
  // Blank CSV cells are missing data, not zero.
  if (!hasNumericValue(value)) return null

  const validValues = rows
    .map((row) => row[metric.key])
    .filter(hasNumericValue)
    .map(Number)

  if (validValues.length === 0) return null

  const min = Math.min(...validValues)
  const max = Math.max(...validValues)

  // A constant metric cannot distinguish players; use a neutral score.
  if (max === min) return 50

  let score = ((Number(value) - min) / (max - min)) * 100
  if (!metric.higher) score = 100 - score

  return Math.round(Math.max(0, Math.min(100, score)))
}

function PlayerProfile() {
  const { category, playerId } = useParams()
  const isBatting = category === 'batting'
  const [player, setPlayer] = useState(null)
  const [dataset, setDataset] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadPlayer() {
      setLoading(true)
      setError('')
      setPlayer(null)

      try {
        const file = isBatting
          ? '/data/batting_best10.csv'
          : '/data/bowling_best10.csv'
        const response = await fetch(file)
        if (!response.ok) throw new Error('Unable to load player data.')

        const rows = parseCSV(await response.text())
        const idColumn = isBatting ? 'striker_id' : 'bowler_id'
        const selected = rows.find((row) => String(row[idColumn]) === playerId)

        if (!selected) throw new Error('Player not found.')

        if (!cancelled) {
          setDataset(rows)
          setPlayer(selected)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (category !== 'batting' && category !== 'bowling') {
      setError('Invalid player category.')
      setLoading(false)
    } else {
      loadPlayer()
    }

    return () => {
      cancelled = true
    }
  }, [category, playerId, isBatting])

  if (loading) {
    return <main className="profile-loading">Loading player profile...</main>
  }

  if (error || !player) {
    return (
      <main className="profile-loading">
        <h2>{error || 'Player unavailable'}</h2>
        <Link to={isBatting ? '/batting' : '/bowling'}>Back to rankings</Link>
      </main>
    )
  }

  const name = isBatting ? player.striker_name : player.bowler_name
  const details = playerImages[category]?.[name]

  if (!details) {
    return <main className="profile-loading">Player details unavailable.</main>
  }

  const imageFolder = isBatting ? 'players' : 'bowlers'
  const image = `/images/${imageFolder}/${details[0]}`
  const primaryMetric = numeric(
    isBatting
      ? player.runs_above_average_per_100_balls
      : player.runs_saved_per_6_balls
  )
  const metrics = PROFILE_METRICS[category]
  // Do not plot missing player values as zero. Keep only metrics with a
  // real numeric value for this player and at least one valid dataset value.
  const chartMetrics = metrics.filter((metric) =>
    hasNumericValue(player[metric.key]) &&
    dataset.some((row) => hasNumericValue(row[metric.key]))
  )

  const stats = isBatting
    ? [
        ['PRESSURE MATCHES', player.pressure_matches, Trophy],
        ['PRESSURE RUNS', player.pressure_runs, Activity],
        ['PRESSURE BALLS', player.pressure_balls, Target],
        ['STRIKE RATE', player.pressure_strike_rate, TrendingUp],
        ['BATTING AVERAGE', player.pressure_average, Gauge],
        ['DOT BALL %', player.pressure_dot_ball_pct, ShieldCheck],
      ]
    : [
        ['PRESSURE MATCHES', player.pressure_matches, Trophy],
        ['PRESSURE WICKETS', player.pressure_wickets, Target],
        ['LEGAL BALLS', player.pressure_legal_balls, Activity],
        ['ECONOMY RATE', player.pressure_economy, TrendingUp],
        ['BOWLING AVERAGE', player.pressure_bowling_average, Gauge],
        ['DOT BALL %', player.pressure_dot_ball_pct, ShieldCheck],
      ]

  const radarOption = {
    animationDuration: 850,
    tooltip: {
      trigger: 'item',
      backgroundColor: '#111b2c',
      borderColor: '#34445e',
      textStyle: { color: '#ffffff' },
    },
    radar: {
      center: ['50%', '52%'],
      radius: '66%',
      indicator: chartMetrics.map((metric) => ({ name: metric.short, max: 100 })),
      axisName: { color: '#cbd5e1', fontSize: 11 },
      splitNumber: 4,
      splitArea: {
        areaStyle: {
          color: ['rgba(30,45,67,.12)', 'rgba(30,45,67,.28)'],
        },
      },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,.2)' } },
      axisLine: { lineStyle: { color: 'rgba(148,163,184,.25)' } },
    },
    series: [{
      type: 'radar',
      data: [{
        name,
        value: chartMetrics.map((metric) => normalizeMetric(player[metric.key], metric, dataset)),
        lineStyle: { color: '#35d5e8', width: 3 },
        itemStyle: { color: '#35d5e8' },
        areaStyle: { color: '#35d5e8', opacity: 0.2 },
      }],
    }],
  }

  // Compare the player's primary ranking metric with the same top-10 dataset.
  const primaryMetricKey = isBatting
    ? 'runs_above_average_per_100_balls'
    : 'runs_saved_per_6_balls'
  const primaryMetricLabel = isBatting
    ? 'Runs above baseline / 100 balls'
    : 'Runs saved / 6 legal balls'
  const comparisonRows = dataset
    .filter((row) => hasNumericValue(row[primaryMetricKey]))
    .slice()
    .sort((a, b) => Number(b[primaryMetricKey]) - Number(a[primaryMetricKey]))
  const comparisonNames = comparisonRows.map((row) =>
    isBatting ? row.striker_name : row.bowler_name
  )
  const comparisonValues = comparisonRows.map((row) => ({
    value: Number(row[primaryMetricKey]),
    itemStyle: {
      color: String(isBatting ? row.striker_id : row.bowler_id) === playerId
        ? '#ec4899'
        : '#8050a8',
      borderRadius: [0, 6, 6, 0],
    },
  }))

  const comparisonOption = {
    animationDuration: 750,
    grid: { left: 8, right: 22, top: 12, bottom: 12, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#211329',
      borderColor: 'rgba(236,72,153,.4)',
      textStyle: { color: '#fff' },
      formatter: (items) => {
        const item = items[0]
        return `${item.name}<br/><strong>${formatValue(item.value, 2)}</strong>`
      },
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#bda8c4', fontSize: 9 },
      splitLine: { lineStyle: { color: 'rgba(236,72,153,.10)' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: comparisonNames,
      axisLabel: {
        color: '#e9d8eb',
        fontSize: 9,
        width: 92,
        overflow: 'truncate',
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: comparisonValues,
      barWidth: 12,
      showBackground: true,
      backgroundStyle: { color: 'rgba(255,255,255,.045)', borderRadius: 6 },
      label: {
        show: true,
        position: 'right',
        color: '#fce7f3',
        fontSize: 9,
        formatter: (params) => formatValue(params.value, 2),
      },
    }],
  }

  const dotBallValue = hasNumericValue(player.pressure_dot_ball_pct)
    ? Math.max(0, Math.min(100, Number(player.pressure_dot_ball_pct)))
    : null
  const ballSplitOption = {
    animationDuration: 750,
    tooltip: {
      trigger: 'item',
      backgroundColor: '#211329',
      borderColor: 'rgba(236,72,153,.4)',
      textStyle: { color: '#fff' },
      formatter: (item) => `${item.name}: ${formatValue(item.value, 1)}%`,
    },
    legend: {
      bottom: 2,
      left: 'center',
      itemWidth: 9,
      itemHeight: 9,
      textStyle: { color: '#d9c4dc', fontSize: 9 },
    },
    graphic: dotBallValue === null ? [{
      type: 'text',
      left: 'center',
      top: 'middle',
      style: { text: 'No dot-ball data', fill: '#c3a9c5', fontSize: 11 },
    }] : [{
      type: 'text',
      left: 'center',
      top: '39%',
      style: {
        text: `${dotBallValue.toFixed(1)}%`,
        fill: '#fff',
        fontSize: 23,
        fontWeight: 800,
        textAlign: 'center',
      },
    }, {
      type: 'text',
      left: 'center',
      top: '53%',
      style: {
        text: 'DOT BALLS',
        fill: '#c3a9c5',
        fontSize: 8,
        fontWeight: 700,
        textAlign: 'center',
      },
    }],
    series: [{
      type: 'pie',
      radius: ['57%', '78%'],
      center: ['50%', '43%'],
      avoidLabelOverlap: true,
      label: { show: false },
      itemStyle: { borderColor: '#1a1022', borderWidth: 3 },
      data: dotBallValue === null ? [] : [
        { name: 'Dot balls', value: dotBallValue, itemStyle: { color: '#ec4899' } },
        { name: 'Non-dot balls', value: 100 - dotBallValue, itemStyle: { color: '#8050a8' } },
      ],
    }],
  }


  return (
    <main className="profile-page">
      <section className="profile-hero">
        <img
          className="profile-background"
          src={image}
          alt=""
          onError={(event) => { event.currentTarget.style.display = 'none' }}
        />
        <div className="profile-hero-shade" />

        <div className="profile-hero-content">
          <Link
            to={isBatting ? '/batting' : '/bowling'}
            className="profile-back"
          >
            <ArrowLeft size={16} /> Back to rankings
          </Link>

          <span className="profile-eyebrow">
            SUPERR ANALYTICS / {isBatting ? 'BATTING' : 'BOWLING'} PROFILE
          </span>

          <div className="profile-title-row">
            <img
              className="profile-portrait"
              src={image}
              alt={name}
              onError={(event) => { event.currentTarget.style.opacity = '0' }}
            />
            <div className="profile-identity">
              <span className="profile-country">{details[1]} {details[2]}</span>
              <h1>{name}</h1>
              <p>
                {isBatting ? 'PRESSURE BATTER' : 'PRESSURE BOWLER'}
                {' '} · RANK #{String(player.rank).padStart(2, '0')}
              </p>
              <div className="profile-hero-tags">
                <span>{isBatting ? 'BATTING INTELLIGENCE' : 'BOWLING INTELLIGENCE'}</span>
                <span>IPL &amp; MEN'S T20I</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="profile-content">
        <div className="profile-section-heading">
          <span>01 / PERFORMANCE OVERVIEW</span>
          <h2>PLAYER STATISTICS</h2>
          <p>
            {isBatting
              ? 'A closer look at scoring output and batting efficiency in pressure situations.'
              : 'A closer look at wicket-taking and run-control performance in pressure situations.'}
          </p>
        </div>

        <div className="profile-stat-grid">
          {stats.map(([label, value, Icon], index) => (
            <article className="profile-stat-card" key={label} style={{ '--card-index': index }}>
              <div className="profile-stat-icon"><Icon size={19} /></div>
              <span>{label}</span>
              <strong>{formatValue(value, 2)}</strong>
            </article>
          ))}
        </div>

        <div className="profile-analysis-heading">
          <span>02 / PERFORMANCE VISUALIZATION</span>
          <h2>{isBatting ? 'BATTING PERFORMANCE MAP' : 'BOWLING PERFORMANCE MAP'}</h2>
          <p>Radar values are normalized against the available top-10 players. Blank source values are excluded.</p>
        </div>

        <div className="profile-analysis-grid">
          <article className="profile-chart-card profile-radar-card">
            <div className="profile-card-heading">
              <div>
                <span>PLAYER ATTRIBUTES</span>
                <h2>PRESSURE RADAR</h2>
              </div>
              <Target size={21} />
            </div>
            <ReactECharts option={radarOption} notMerge lazyUpdate style={{ height: 350, width: '100%' }} />
            <p>Higher normalized scores indicate a stronger relative result for each metric. Lower-is-better metrics are inverted.</p>
          </article>

          <article className="profile-chart-card profile-comparison-card">
            <div className="profile-card-heading">
              <div>
                <span>TOP-10 LEADERBOARD</span>
                <h2>{isBatting ? 'RUNS ABOVE BASELINE' : 'RUNS SAVED COMPARISON'}</h2>
              </div>
              <BarChart3 size={21} />
            </div>
            <ReactECharts option={comparisonOption} notMerge lazyUpdate style={{ height: 285, width: '100%' }} />
            <p>Compares the primary ranking metric across the available top-10 dataset. Pink highlights this player.</p>
          </article>
          <article className="profile-chart-card profile-ball-split-card">
            <div className="profile-card-heading">
              <div>
                <span>PRESSURE BALL PROFILE</span>
                <h2>DOT-BALL SPLIT</h2>
              </div>
              <Activity size={21} />
            </div>
            <ReactECharts option={ballSplitOption} notMerge lazyUpdate style={{ height: 285, width: '100%' }} />
            <p>Dot-ball and non-dot-ball share, based on the player's pressure dot-ball percentage.</p>
          </article>
        </div>

        <div className="profile-analysis-grid profile-secondary-grid">
          <article className="profile-detail-card">
            <span>03 / PRIMARY RANKING METRIC</span>
            <h2>{isBatting ? 'RUNS ABOVE BASELINE' : 'RUNS SAVED'}</h2>
            <div className="profile-primary-metric">
              <strong>{formatValue(primaryMetric)}</strong>
              <span>{isBatting ? 'per 100 pressure balls' : 'per 6 pressure legal balls'}</span>
            </div>
            <p>
              {isBatting
                ? 'Runs above the pooled competition-and-phase baseline per 100 pressure balls.'
                : 'Runs saved against the pooled competition-and-phase baseline per 6 pressure legal balls.'}
            </p>
          </article>

          <article className="profile-detail-card">
            <span>04 / RANKING DETAILS</span>
            <h2>PERFORMANCE SUMMARY</h2>
            <div className="profile-detail-line">
              <span>Category</span>
              <strong>{isBatting ? 'Batter' : 'Bowler'}</strong>
            </div>
            <div className="profile-detail-line">
              <span>Ranking position</span>
              <strong>#{player.rank}</strong>
            </div>
            <div className="profile-detail-line">
              <span>Pressure matches</span>
              <strong>{player.pressure_matches}</strong>
            </div>
            <div className="profile-detail-line">
              <span>Primary metric</span>
              <strong>{formatValue(primaryMetric)}</strong>
            </div>
            <div className="profile-detail-line">
              <span>Competition</span>
              <strong>IPL &amp; Men's T20I</strong>
            </div>
          </article>
        </div>

        <div className="profile-disclaimer">
          <ShieldCheck size={18} />
          <p>
            These figures describe the available pressure-performance dataset.
            They are not official ICC rating points or a complete career record.
            Pressure labels are heuristic, not calibrated win-probability estimates.
            Radar values are relative to the available top-10 dataset. The leaderboard uses the primary ranking metric; the ball split uses the source dot-ball percentage.
          </p>
        </div>
      </section>
    </main>
  )
}

export default PlayerProfile
