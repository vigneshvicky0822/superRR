
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import './RankingPage.css'

const bowlerInfo = {
  'Abrar Ahmed': {
    image: 'abrar-ahmed.png',
    flag: '🇵🇰',
    country: 'Pakistan',
  },
  'Mohammad Nawaz': {
    image: 'mohammad-nawaz.png',
    flag: '🇵🇰',
    country: 'Pakistan',
  },
  'Sunil Narine': {
    image: 'sunil-narine.png',
    flag: '🌴',
    country: 'West Indies',
  },
  'Jasprit Bumrah': {
    image: 'jasprit-bumrah.png',
    flag: '🇮🇳',
    country: 'India',
  },
  'Akeal Hosein': {
    image: 'akeal-hosein.png',
    flag: '🌴',
    country: 'West Indies',
  },
  'Mustafizur Rahman': {
    image: 'mustafizur-rahman.png',
    flag: '🇧🇩',
    country: 'Bangladesh',
  },
  'Mohammad Wasim': {
    image: 'mohammad-wasim.png',
    flag: '🇵🇰',
    country: 'Pakistan',
  },
  'Jamie Overton': {
    image: 'jamie-overton.png',
    flag: '🏴',
    country: 'England',
  },
  'Shadab Khan': {
    image: 'shadab-khan.png',
    flag: '🇵🇰',
    country: 'Pakistan',
  },
  'Salman Mirza': {
    image: 'salman-mirza.png',
    flag: '🇵🇰',
    country: 'Pakistan',
  },
}

function Bowling() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRankings() {
      try {
        const response = await fetch('/data/bowling_best10.csv')

        if (!response.ok) {
          throw new Error('Unable to load bowling rankings data.')
        }

        const csv = await response.text()
        const lines = csv.trim().split(/\r?\n/)

        if (lines.length < 2) {
          throw new Error('No bowling ranking records found.')
        }

        function parseCSVLine(line) {
          const values = []
          let value = ''
          let insideQuotes = false

          for (let i = 0; i < line.length; i++) {
            const char = line[i]

            if (char === '"' && line[i + 1] === '"' && insideQuotes) {
              value += '"'
              i++
            } else if (char === '"') {
              insideQuotes = !insideQuotes
            } else if (char === ',' && !insideQuotes) {
              values.push(value.trim())
              value = ''
            } else {
              value += char
            }
          }

          values.push(value.trim())
          return values
        }

        const headers = parseCSVLine(lines[0])

        const rows = lines.slice(1)
          .filter((line) => line.trim())
          .map((line) => {
            const values = parseCSVLine(line)

            return Object.fromEntries(
              headers.map((header, index) => [
                header,
                values[index] ?? '',
              ])
            )
          })

        setPlayers(rows)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadRankings()
  }, [])

  const format = (value) => {
    const number = Number(value)
    return Number.isFinite(number) ? number.toFixed(2) : '—'
  }

  return (
    <main className="ranking-page">

      {/* HERO BANNER */}
      <section
        className="ranking-hero"
        style={{
          backgroundImage: "url('/images/banners/bowling-banner.png')",
        }}
      >
        <div className="ranking-hero-content">
          <span>SUPERR ANALYTICS / PLAYER PERFORMANCE</span>
          <h1>BOWLING RANKINGS</h1>
          <p>Discover the bowlers who dominate under pressure.</p>
        </div>
      </section>

      {/* RANKING CONTENT */}
      <section className="ranking-content">

        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <div className="ranking-heading">
          <span>2022 — 2026 / IPL &amp; MEN'S T20I</span>

          <h2>TOP 10 PRESSURE BOWLERS</h2>

          <p>
            Ranked by runs saved against the competition-phase
            baseline per 6 pressure legal balls.
          </p>
        </div>

        {loading && <p>Loading bowling rankings...</p>}

        {error && <p className="ranking-error">{error}</p>}

        {!loading && !error && (
          <div className="batting-ranking-list">

            <div className="ranking-table-heading">
              <span>RANK / PLAYER</span>
              <span>MATCHES</span>
              <span>WICKETS</span>
              <span>ECONOMY</span>
              <span>RUNS SAVED / 6</span>
            </div>

            {players.map((player, index) => {
              const info = bowlerInfo[player.bowler_name]

              return (
                <Link
                  to={`/player/bowling/${encodeURIComponent(player.bowler_id)}`}
                  className="bowling-profile-link"
                  style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
                  key={player.bowler_id || index}
                  aria-label={`View ${player.bowler_name} profile`}
                >
                <article className="batting-player-row">

                  {/* BOWLER IDENTITY */}
                  <div className="player-identity">

                    <span className="player-rank">
                      {String(player.rank || index + 1).padStart(2, '0')}
                    </span>

                    {info ? (
                      <img
                        className="player-photo"
                        src={`/images/bowlers/${info.image}`}
                        alt={player.bowler_name}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="player-avatar-fallback">
                        {player.bowler_name?.charAt(0) || '?'}
                      </div>
                    )}

                    <div className="player-details">
                      <h3>{player.bowler_name}</h3>
                      <span>
                        {info?.flag} {info?.country || 'PLAYER'}
                      </span>
                    </div>

                  </div>

                  {/* MATCHES */}
                  <div className="player-stat">
                    <span className="mobile-stat-label">MATCHES</span>
                    {player.pressure_matches || '—'}
                  </div>

                  {/* WICKETS */}
                  <div className="player-stat">
                    <span className="mobile-stat-label">WICKETS</span>
                    {player.pressure_wickets || '—'}
                  </div>

                  {/* ECONOMY */}
                  <div className="player-stat">
                    <span className="mobile-stat-label">ECONOMY</span>
                    {format(player.pressure_economy)}
                  </div>

                  {/* RANKING SCORE */}
                  <div className="player-score">
                    <TrendingUp size={15} />
                    {format(player.runs_saved_per_6_balls)}
                  </div>

                </article>
                </Link>
              )
            })}

          </div>
        )}

        <p className="ranking-note">
          Ranking score represents runs saved against the competition-and-phase
          baseline per 6 pressure legal balls. It is not an official ICC rating.
          Bowling runs conceded, extras and legal-ball definitions remain provisional.
        </p>

      </section>
    </main>
  )
}

export default Bowling
