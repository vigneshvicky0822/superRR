
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import './RankingPage.css'

const playerInfo = {
  'Naman Dhir': { image: 'naman-dhir.png', flag: '🇮🇳', country: 'India' },
  'Dhruv Jurel': { image: 'dhruv-jurel.png', flag: '🇮🇳', country: 'India' },
  'Dinesh Karthik': { image: 'dinesh-karthik.png', flag: '🇮🇳', country: 'India' },
  'Ashutosh Sharma': { image: 'ashutosh-sharma.png', flag: '🇮🇳', country: 'India' },
  'Tim David': { image: 'tim-david.png', flag: '🇦🇺', country: 'Australia' },
  'Sikandar Raza': { image: 'sikandar-raza.png', flag: '🇿🇼', country: 'Zimbabwe' },
  'Aiden Markram': { image: 'aiden-markram.png', flag: '🇿🇦', country: 'South Africa' },
  'Suryakumar Yadav': { image: 'suryakumar-yadav.png', flag: '🇮🇳', country: 'India' },
  'Jitesh Sharma': { image: 'jitesh-sharma.png', flag: '🇮🇳', country: 'India' },
  'Namboori Tilak Varma': { image: 'tilak-varma.png', flag: '🇮🇳', country: 'India' },
}

function Batting() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRankings() {
      try {
        const response = await fetch('/data/batting_best10.csv')

        if (!response.ok) {
          throw new Error('Unable to load batting rankings data.')
        }

        const csv = await response.text()
        const lines = csv.trim().split(/\r?\n/)

        if (lines.length < 2) {
          throw new Error('No batting ranking records found.')
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
          backgroundImage: "url('/images/banners/batting-banner.png')",
        }}
      >
        <div className="ranking-hero-content">
          <span>SUPERR ANALYTICS / PLAYER PERFORMANCE</span>
          <h1>BATTING RANKINGS</h1>
          <p>Discover the batters who perform under pressure.</p>
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
          <h2>TOP 10 PRESSURE BATTERS</h2>
          <p>
            Ranked by runs above competition-phase baseline per 100 pressure balls.
          </p>
        </div>

        {loading && <p>Loading batting rankings...</p>}

        {error && <p className="ranking-error">{error}</p>}

        {!loading && !error && (
          <div className="batting-ranking-list">

            <div className="ranking-table-heading">
              <span>RANK / PLAYER</span>
              <span>MATCHES</span>
              <span>RUNS</span>
              <span>STRIKE RATE</span>
              <span>RANKING SCORE</span>
            </div>

            {players.map((player, index) => {
              const info = playerInfo[player.striker_name]

              return (
                <Link
                  to={`/player/batting/${encodeURIComponent(player.striker_id)}`}
                  className="batting-player-row"
                  key={player.striker_id || index}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >

                  <div className="player-identity">

                    <span className="player-rank">
                      {String(player.rank || index + 1).padStart(2, '0')}
                    </span>

                    {info ? (
                      <img
                        className="player-photo"
                        src={`/images/players/${info.image}`}
                        alt={player.striker_name}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="player-avatar-fallback">
                        {player.striker_name?.charAt(0) || '?'}
                      </div>
                    )}

                    <div className="player-details">
                      <h3>{player.striker_name}</h3>
                      <span>
                        {info?.flag} {info?.country || 'PLAYER'}
                      </span>
                    </div>

                  </div>

                  <div className="player-stat">
                    <span className="mobile-stat-label">MATCHES</span>
                    {player.pressure_matches || '—'}
                  </div>

                  <div className="player-stat">
                    <span className="mobile-stat-label">RUNS</span>
                    {player.pressure_runs || '—'}
                  </div>

                  <div className="player-stat">
                    <span className="mobile-stat-label">STRIKE RATE</span>
                    {format(player.pressure_strike_rate)}
                  </div>

                  <div className="player-score">
                    <TrendingUp size={15} />
                    {format(player.runs_above_average_per_100_balls)}
                  </div>

                </Link>
              )
            })}

          </div>
        )}

        <p className="ranking-note">
          Ranking score represents runs above the competition-and-phase
          baseline per 100 pressure balls. It is not an official ICC rating.
        </p>

      </section>
    </main>
  )
}

export default Batting
