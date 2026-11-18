
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Plus,
  X,
  Users,
  Target,
} from 'lucide-react'
import './Comparison.css'

const DATA_FILES = {
  batting: '/data/batting_best10.csv',
  bowling: '/data/bowling_best10.csv',
}

const PLAYER_IMAGES = {
  batting: {
    'Naman Dhir': 'naman-dhir.png',
    'Dhruv Jurel': 'dhruv-jurel.png',
    'Dinesh Karthik': 'dinesh-karthik.png',
    'Ashutosh Sharma': 'ashutosh-sharma.png',
    'Tim David': 'tim-david.png',
    'Sikandar Raza': 'sikandar-raza.png',
    'Aiden Markram': 'aiden-markram.png',
    'Suryakumar Yadav': 'suryakumar-yadav.png',
    'Jitesh Sharma': 'jitesh-sharma.png',
    'Namboori Tilak Varma': 'tilak-varma.png',
  },
  bowling: {
    'Abrar Ahmed': 'abrar-ahmed.png',
    'Mohammad Nawaz': 'mohammad-nawaz.png',
    'Sunil Narine': 'sunil-narine.png',
    'Jasprit Bumrah': 'jasprit-bumrah.png',
    'Akeal Hosein': 'akeal-hosein.png',
    'Mustafizur Rahman': 'mustafizur-rahman.png',
    'Mohammad Wasim': 'mohammad-wasim.png',
    'Jamie Overton': 'jamie-overton.png',
    'Shadab Khan': 'shadab-khan.png',
    'Salman Mirza': 'salman-mirza.png',
  },
}

const METRICS = {
  batting: [
    {
      key: 'runs_above_average_per_100_balls',
      label: 'Runs above baseline / 100 balls',
      short: 'Baseline runs',
      higher: true,
    },
    {
      key: 'pressure_strike_rate',
      label: 'Pressure strike rate',
      short: 'Strike rate',
      higher: true,
    },
    {
      key: 'pressure_average',
      label: 'Pressure batting average',
      short: 'Batting average',
      higher: true,
    },
    {
      key: 'pressure_dot_ball_pct',
      label: 'Pressure dot-ball percentage',
      short: 'Dot-ball %',
      higher: false,
    },
    {
      key: 'pressure_matches',
      label: 'Pressure matches',
      short: 'Matches',
      higher: true,
    },
  ],
  bowling: [
    {
      key: 'runs_saved_per_6_balls',
      label: 'Runs saved per 6 balls',
      short: 'Runs saved',
      higher: true,
    },
    {
      key: 'pressure_economy',
      label: 'Pressure economy',
      short: 'Economy',
      higher: false,
    },
    {
      key: 'pressure_bowling_average',
      label: 'Pressure bowling average',
      short: 'Bowling average',
      higher: false,
    },
    {
      key: 'pressure_wickets',
      label: 'Pressure wickets',
      short: 'Wickets',
      higher: true,
    },
    {
      key: 'pressure_dot_ball_pct',
      label: 'Pressure dot-ball percentage',
      short: 'Dot-ball %',
      higher: true,
    },
  ],
}

const COLORS = ['#35d5e8', '#f5b942', '#f15b78']

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

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])

  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCSVLine(line)

    return Object.fromEntries(
      headers.map((header, index) => [
        header,
        values[index] ?? '',
      ])
    )
  })
}

function getPlayerId(player, category) {
  return category === 'batting'
    ? String(player.striker_id)
    : String(player.bowler_id)
}

function getPlayerName(player, category) {
  return category === 'batting'
    ? player.striker_name
    : player.bowler_name
}

function getImagePath(player, category) {
  const name = getPlayerName(player, category)
  const image = PLAYER_IMAGES[category][name]

  if (!image) return null

  const folder = category === 'batting' ? 'players' : 'bowlers'
  return `/images/${folder}/${image}`
}

function formatValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : '—'
}

function normalizeMetric(value, metric, rows) {
  const values = rows
    .map((row) => Number(row[metric.key]))
    .filter(Number.isFinite)

  if (!Number.isFinite(Number(value)) || values.length === 0) return 0

  const min = Math.min(...values)
  const max = Math.max(...values)

  if (max === min) return 50

  let score = ((Number(value) - min) / (max - min)) * 100

  if (!metric.higher) score = 100 - score

  return Math.round(score)
}

function Comparison() {
  const [category, setCategory] = useState('batting')
  const [players, setPlayers] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [comparedIds, setComparedIds] = useState([])
  const [availableId, setAvailableId] = useState('')
  const [playerDropdownOpen, setPlayerDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadPlayers() {
      setLoading(true)
      setError('')
      setSelectedIds([])
      setComparedIds([])
      setAvailableId('')
      setPlayerDropdownOpen(false)

      try {
        const response = await fetch(DATA_FILES[category])

        if (!response.ok) {
          throw new Error('Could not load the player dataset.')
        }

        const csv = await response.text()
        const data = parseCSV(csv)

        if (!cancelled) {
          setPlayers(data)
          setSelectedIds(data.length > 0 ? [getPlayerId(data[0], category)] : [])
        }
      } catch (err) {
        if (!cancelled) {
          setPlayers([])
          setSelectedIds([])
          setError(err.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPlayers()

    return () => {
      cancelled = true
    }
  }, [category])

  const selectedPlayers = useMemo(
    () =>
      selectedIds
        .map((id) => players.find((player) => getPlayerId(player, category) === id))
        .filter(Boolean),
    [selectedIds, players, category]
  )

  const unselectedPlayers = players.filter(
    (player) => !selectedIds.includes(getPlayerId(player, category))
  )

  // Results update only when the user presses COMPARE PLAYERS.
  const comparedPlayers = useMemo(
    () =>
      comparedIds
        .map((id) => players.find((player) => getPlayerId(player, category) === id))
        .filter(Boolean),
    [comparedIds, players, category]
  )

  const metrics = METRICS[category]

  function comparePlayers() {
    if (selectedIds.length < 2) return
    setComparedIds([...selectedIds])
  }

  function addPlayer() {
    if (!availableId || selectedIds.length >= 3) return

    setSelectedIds((current) => [...current, availableId])
    setAvailableId('')
    setPlayerDropdownOpen(false)
  }

  function removePlayer(id) {
    setSelectedIds((current) => current.filter((item) => item !== id))
  }

  const radarOption = useMemo(() => {
    if (comparedPlayers.length === 0) return {}

    return {
      backgroundColor: 'transparent',
      animationDuration: 700,
      tooltip: {
        trigger: 'item',
        backgroundColor: '#111b2c',
        borderColor: '#34445e',
        textStyle: { color: '#ffffff' },
      },
      legend: {
        bottom: 5,
        data: comparedPlayers.map((player) => getPlayerName(player, category)),
        textStyle: { color: '#cbd5e1', fontSize: 11 },
      },
      radar: {
        center: ['50%', '45%'],
        radius: '65%',
        shape: 'polygon',
        indicator: metrics.map((metric) => ({
          name: metric.short,
          max: 100,
        })),
        axisName: {
          color: '#dbe5f3',
          fontSize: 11,
        },
        splitNumber: 4,
        splitArea: {
          areaStyle: {
            color: ['rgba(30, 45, 67, 0.12)', 'rgba(30, 45, 67, 0.3)'],
          },
        },
        splitLine: {
          lineStyle: { color: 'rgba(148, 163, 184, 0.18)' },
        },
        axisLine: {
          lineStyle: { color: 'rgba(148, 163, 184, 0.22)' },
        },
      },
      series: [
        {
          type: 'radar',
          data: comparedPlayers.map((player, index) => ({
            name: getPlayerName(player, category),
            value: metrics.map((metric) =>
              normalizeMetric(player[metric.key], metric, players)
            ),
            lineStyle: {
              color: COLORS[index],
              width: 2.5,
            },
            itemStyle: { color: COLORS[index] },
            areaStyle: { color: COLORS[index], opacity: 0.12 },
          })),
        },
      ],
    }
  }, [comparedPlayers, category, metrics, players])

  return (
    <div className="comparison-page">
      <header className="comparison-topbar">
        <Link to="/" className="comparison-brand">
          SUPERR<span>.</span>
        </Link>

        <Link to="/" className="comparison-back">
          <ArrowLeft size={16} /> BACK TO HOME
        </Link>
      </header>

      <main className="comparison-main">
        <section className="comparison-heading">
          <span>SUPERR ANALYTICS / PLAYER INTELLIGENCE</span>
          <h1>PLAYER COMPARISON <em>LAB.</em></h1>
          <p>
            Compare pressure-performance profiles using the available
            batting and bowling datasets.
          </p>
        </section>

        <section className="comparison-workspace">
          <aside className="comparison-sidebar">
            <div className="comparison-panel-title">
              <Users size={19} />
              <h2>SELECT PLAYERS</h2>
            </div>

            <div className="comparison-tabs">
              <button
                className={category === 'batting' ? 'active' : ''}
                onClick={() => setCategory('batting')}
              >
                BATTERS
              </button>

              <button
                className={category === 'bowling' ? 'active' : ''}
                onClick={() => setCategory('bowling')}
              >
                BOWLERS
              </button>
            </div>

            <div className="comparison-selection-count">
              SELECTED PLAYERS
              <strong>{selectedPlayers.length} / 3</strong>
            </div>

            <div className="comparison-selected-list">
              {selectedPlayers.map((player, index) => {
                const id = getPlayerId(player, category)
                const name = getPlayerName(player, category)

                return (
                  <div className="comparison-selected-player" key={id}>
                    <div className="comparison-player-avatar">
                      {getImagePath(player, category) ? (
                        <img src={getImagePath(player, category)} alt={name} />
                      ) : (
                        <Users size={20} />
                      )}
                    </div>

                    <div className="comparison-player-name">
                      <span style={{ color: COLORS[index] }}>
                        PLAYER {index + 1}
                      </span>
                      <strong>{name}</strong>
                    </div>

                    <button
                      className="comparison-remove"
                      onClick={() => removePlayer(id)}
                      aria-label={`Remove ${name}`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )
              })}

              {selectedPlayers.length === 0 && (
                <p className="comparison-empty">
                  Choose players from the list below to begin.
                </p>
              )}
            </div>

            <label className="comparison-select-label" htmlFor="player-select">
              ADD ANOTHER PLAYER
            </label>

            <div className="comparison-player-picker">
              <button
                id="player-select"
                type="button"
                className="comparison-player-picker-trigger"
                onClick={() => setPlayerDropdownOpen((open) => !open)}
                disabled={loading || selectedIds.length >= 3 || unselectedPlayers.length === 0}
                aria-haspopup="listbox"
                aria-expanded={playerDropdownOpen}
              >
                <span>
                  {availableId
                    ? getPlayerName(
                        players.find((player) => getPlayerId(player, category) === availableId),
                        category
                      )
                    : 'Choose a player'}
                </span>
                <span className={`comparison-picker-chevron ${playerDropdownOpen ? 'open' : ''}`}>
                  ▾
                </span>
              </button>

              {playerDropdownOpen && (
                <div className="comparison-player-picker-menu" role="listbox" aria-label="Choose a player">
                  {unselectedPlayers.length > 0 ? (
                    unselectedPlayers.map((player) => {
                      const id = getPlayerId(player, category)
                      const name = getPlayerName(player, category)

                      return (
                        <button
                          type="button"
                          role="option"
                          aria-selected={availableId === id}
                          className={`comparison-player-picker-option ${availableId === id ? 'selected' : ''}`}
                          key={id}
                          onClick={() => {
                            setAvailableId(id)
                            setPlayerDropdownOpen(false)
                          }}
                        >
                          {name}
                        </button>
                      )
                    })
                  ) : (
                    <div className="comparison-player-picker-empty">
                      No more players available.
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              className="comparison-add-button"
              onClick={addPlayer}
              disabled={!availableId || selectedIds.length >= 3}
            >
              <Plus size={17} /> ADD PLAYER
            </button>

            <button
              className="comparison-add-button comparison-run-button"
              onClick={comparePlayers}
              disabled={selectedIds.length < 2 || loading}
              style={{ marginTop: '10px' }}
            >
              <BarChart3 size={17} /> COMPARE PLAYERS
            </button>

            <div className="comparison-limit-note">
              <Target size={17} />
              <p>Compare up to three players in one analysis.</p>
            </div>
          </aside>

          <section className="comparison-visual-area">
            <div className="comparison-chart-heading">
              <div>
                <span>PERFORMANCE VISUALIZATION</span>
                <h2>PLAYER RADAR ANALYSIS</h2>
              </div>
              <BarChart3 size={23} />
            </div>

            {loading ? (
              <div className="comparison-message">Loading player dataset...</div>
            ) : error ? (
              <div className="comparison-message">{error}</div>
            ) : comparedPlayers.length === 0 ? (
              <div className="comparison-message">
                Select at least two players and press COMPARE PLAYERS to view the analysis.
              </div>
            ) : (
              <ReactECharts
                option={radarOption}
                notMerge
                lazyUpdate
                style={{ height: '510px', width: '100%' }}
              />
            )}

            <div className="comparison-chart-note">
              Radar values are normalized from 0–100 against the available
              top-10 dataset. They are relative visualization scores, not
              percentiles or probabilities.
            </div>
          </section>
        </section>

        <section className="comparison-metrics-section">
          <div className="comparison-chart-heading">
            <div>
              <span>RAW DATA / SIDE-BY-SIDE</span>
              <h2>METRIC COMPARISON</h2>
            </div>
            <ArrowUpRight size={23} />
          </div>

          {comparedPlayers.length > 0 ? (
            <div className="comparison-table-wrap">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>PERFORMANCE METRIC</th>
                    {comparedPlayers.map((player) => (
                      <th key={getPlayerId(player, category)}>
                        {getPlayerName(player, category)}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {metrics.map((metric) => (
                    <tr key={metric.key}>
                      <td>{metric.label}</td>
                      {comparedPlayers.map((player) => (
                        <td key={getPlayerId(player, category)}>
                          {formatValue(player[metric.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="comparison-message">
              Select at least two players and press COMPARE PLAYERS to view their detailed statistics.
            </div>
          )}
        </section>

        <div className="comparison-disclaimer">
          <Target size={17} />
          <p>
            Comparisons use the current pressure-performance dataset and
            ranking methodology. They should not be interpreted as direct
            predictions of future player performance.
          </p>
        </div>
      </main>
    </div>
  )
}

export default Comparison
