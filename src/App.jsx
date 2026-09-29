import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// ==========================================
// CONFIGURAZIONE CREDENZIALI
// ==========================================
const TMDB_API_KEY = '035e2ed8235477ef7a0741440a067620';
const SUPABASE_URL = 'https://oohhpraeftzfwxqzuyjk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NYtALNdY5TpvRwhTMp2Q3g_PuqCuukU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Generi TMDB
const GENRES = [
  { id: '', name: 'Tutti i generi' },
  { id: 28, name: 'Azione' },
  { id: 35, name: 'Commedia' },
  { id: 18, name: 'Drammatico' },
  { id: 53, name: 'Thriller' },
  { id: 878, name: 'Fantascienza' },
  { id: 27, name: 'Horror' },
  { id: 10749, name: 'Romantico' },
  { id: 16, name: 'Animazione' }
];

// Categorie di valutazione
const RATING_CATEGORIES = [
  { key: 'overall', label: 'Overall', icon: '⭐' },
  { key: 'plot_uniqueness', label: 'Unicità della trama', icon: '🌀' },
  { key: 'fun', label: 'Divertimento', icon: '🎉' },
  { key: 'cringe', label: 'Cringe', icon: '😬' },
  { key: 'jumpscares', label: 'Jumpscares', icon: '😱' },
  { key: 'hotties', label: 'Quanti bone/boni hai visto 😡', icon: '😡' },
  { key: 'protagonist_envy', label: 'Quanto vorremmo essere al posto del protagonista', icon: '👑' },
  { key: 'horny_meter', label: 'Quante volte ci fa venire voglia di fare sesso 🥵', icon: '🥵' }
];

const DEFAULT_RATINGS = {
  overall: 5,
  plot_uniqueness: 5,
  fun: 5,
  cringe: 5,
  jumpscares: 5,
  hotties: 5,
  protagonist_envy: 5,
  horny_meter: 5
};

export default function App() {
  const [activeTab, setActiveTab] = useState('club');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ricerca TMDB
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [tmdbResults, setTmdbResults] = useState([]);

  // Form Valuta
  const [activeVoter, setActiveVoter] = useState('giulio');
  const [selectedMovieToEvaluate, setSelectedMovieToEvaluate] = useState('');
  const [ratings, setRatings] = useState(DEFAULT_RATINGS);
  const [notes, setNotes] = useState('');

  // Ordinamento
  const [sortBy, setSortBy] = useState('overall');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedMovieId, setExpandedMovieId] = useState(null);

  useEffect(() => {
    fetchSupabaseMovies();
  }, []);

  useEffect(() => {
    if (activeTab === 'library') {
      if (searchQuery.trim() !== '') {
        searchTmdbMovies(searchQuery);
      } else {
        fetchPopularOrGenreMovies(selectedGenre);
      }
    }
  }, [searchQuery, selectedGenre, activeTab]);

  const fetchSupabaseMovies = async () => {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Errore recupero film:', error);
      return;
    }
    if (data) {
      setMovies(data);
    }
  };

  const searchTmdbMovies = async (query) => {
    setLoading(true);
    try {
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=it-IT&query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setTmdbResults(data.results || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchPopularOrGenreMovies = async (genreId) => {
    setLoading(true);
    try {
      let url = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=it-IT&page=1`;
      if (genreId) {
        url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=it-IT&with_genres=${genreId}&sort_by=popularity.desc`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setTmdbResults(data.results || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const getMovieExistingList = (tmdbId) => {
    const existing = movies.find(m => String(m.tmdb_id) === String(tmdbId));
    if (!existing) return null;
    if (existing.status === 'watched') return 'Il Club';
    if (existing.status === 'watchlist') return 'Da Vedere';
    return 'In Valutazione';
  };

  const addToWatchlist = async (tmdbMovie) => {
    const existingList = getMovieExistingList(tmdbMovie.id);
    if (existingList) {
      alert(`"${tmdbMovie.title}" è già presente nella lista "${existingList}"!`);
      return;
    }

    const newMovie = {
      tmdb_id: tmdbMovie.id,
      title: tmdbMovie.title || 'Senza titolo',
      poster_path: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : null,
      overview: tmdbMovie.overview || '',
      release_year: tmdbMovie.release_date ? tmdbMovie.release_date.substring(0, 4) : 'N/D',
      status: 'watchlist'
    };

    const { data, error } = await supabase.from('movies').insert([newMovie]).select();

    if (error) {
      alert(`Errore salvataggio: ${error.message}`);
      return;
    }

    if (data && data.length > 0) {
      setMovies((prev) => [data[0], ...prev]);
      alert(`"${tmdbMovie.title}" aggiunto a Da Vedere!`);
    }
  };

  const markAsSeenPending = async (movieOrTmdb) => {
    if (movieOrTmdb.id && movieOrTmdb.status) {
      const { data, error } = await supabase
        .from('movies')
        .update({ status: 'pending_evaluation' })
        .eq('id', movieOrTmdb.id)
        .select();

      if (error) {
        alert(`Errore aggiornamento: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        setMovies((prev) => prev.map((m) => (m.id === movieOrTmdb.id ? data[0] : m)));
        alert(`"${movieOrTmdb.title}" segnato come visto! Ora è pronto per la valutazione.`);
      }
    } else {
      const existingList = getMovieExistingList(movieOrTmdb.id);
      if (existingList) {
        alert(`"${movieOrTmdb.title}" è già presente nella lista "${existingList}"!`);
        return;
      }

      const newMovie = {
        tmdb_id: movieOrTmdb.id,
        title: movieOrTmdb.title || 'Senza titolo',
        poster_path: movieOrTmdb.poster_path ? `https://image.tmdb.org/t/p/w500${movieOrTmdb.poster_path}` : null,
        overview: movieOrTmdb.overview || '',
        release_year: movieOrTmdb.release_date ? movieOrTmdb.release_date.substring(0, 4) : 'N/D',
        status: 'pending_evaluation'
      };

      const { data, error } = await supabase.from('movies').insert([newMovie]).select();

      if (error) {
        alert(`Errore salvataggio: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        setMovies((prev) => [data[0], ...prev]);
        alert(`"${movieOrTmdb.title}" segnato come visto! Ora puoi valutarlo.`);
      }
    }
  };

  const deleteMovie = async (id, title) => {
    if (!window.confirm(`Sei sicuro di voler rimuovere "${title}"?`)) return;
    const { error } = await supabase.from('movies').delete().eq('id', id);
    if (error) {
      alert(`Errore eliminazione: ${error.message}`);
    } else {
      setMovies(movies.filter(m => m.id !== id));
    }
  };

  const handleSaveEvaluation = async () => {
    if (!selectedMovieToEvaluate) {
      alert('Seleziona prima un film dal menu a tendina!');
      return;
    }

    const movie = movies.find(m => String(m.id) === String(selectedMovieToEvaluate));
    if (!movie) return;

    const isGiulio = activeVoter === 'giulio';
    const newGiulioRatings = isGiulio ? ratings : (movie.ratings_giulio || null);
    const newFranciRatings = !isGiulio ? ratings : (movie.ratings_franci || null);

    const bothHaveVoted = Boolean(newGiulioRatings && newFranciRatings);

    let updatedNotes = movie.notes || '';
    if (notes.trim() !== '') {
      const voterName = isGiulio ? 'Giulio' : 'Franci';
      updatedNotes = updatedNotes ? `${updatedNotes} | ${voterName}: ${notes}` : `${voterName}: ${notes}`;
    }

    const payload = {
      ratings_giulio: newGiulioRatings,
      ratings_franci: newFranciRatings,
      status: bothHaveVoted ? 'watched' : 'pending_evaluation',
      notes: updatedNotes
    };

    const { data, error } = await supabase
      .from('movies')
      .update(payload)
      .eq('id', selectedMovieToEvaluate)
      .select();

    if (!error && data) {
      setMovies(movies.map(m => String(m.id) === String(selectedMovieToEvaluate) ? data[0] : m));
      setSelectedMovieToEvaluate('');
      setRatings(DEFAULT_RATINGS);
      setNotes('');

      if (bothHaveVoted) {
        alert(`🎉 Entrambi avete votato! "${movie.title}" è ufficialmente in "Il Club"!`);
        setActiveTab('club');
      } else {
        alert(`✅ Voto di ${isGiulio ? 'Giulio' : 'Franci'} salvato! In attesa del voto di ${isGiulio ? 'Franci' : 'Giulio'}.`);
      }
    } else {
      alert(`Errore: ${error?.message || ''}`);
    }
  };

  const getMovieScore = (movie, key) => {
    const g = movie.ratings_giulio || {};
    const f = movie.ratings_franci || {};

    if (key === 'overall') {
      const valG = g.overall || 0;
      const valF = f.overall || 0;
      return (valG && valF) ? (valG + valF) / 2 : (valG || valF || 0);
    }
    if (key === 'overall_giulio') return g.overall || 0;
    if (key === 'overall_franci') return f.overall || 0;

    const valG = g[key] || 0;
    const valF = f[key] || 0;
    return (valG && valF) ? (valG + valF) / 2 : (valG || valF || 0);
  };

  const clubMovies = movies.filter(m => m.status === 'watched');
  const watchlistMovies = movies.filter(m => m.status === 'watchlist');

  const evaluableMoviesForActiveVoter = movies.filter(m => {
    if (m.status === 'watched') return false;
    if (m.status !== 'pending_evaluation' && m.status !== 'watchlist') return false;
    if (activeVoter === 'giulio') return !m.ratings_giulio;
    if (activeVoter === 'franci') return !m.ratings_franci;
    return true;
  });

  const sortedClubMovies = [...clubMovies].sort((a, b) => {
    const scoreA = getMovieScore(a, sortBy);
    const scoreB = getMovieScore(b, sortBy);
    return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
  });

  const selectedMovieObject = movies.find(m => String(m.id) === String(selectedMovieToEvaluate));

  return (
    <div style={styles.container}>
      
      {/* HEADER BANNER SOLO IMMAGINE */}
      <header style={styles.header}>
        <div style={styles.bannerWrapper}>
          <img
            src="/header.jpg"
            alt="Franci e Giulio Movie Club"
            style={styles.bannerImage}
            onError={(e) => {
              // Se l'immagine non è ancora caricata nella cartella public, non mostra un box rotto
              e.target.style.display = 'none';
            }}
          />
        </div>

        {/* BARRA DI NAVIGAZIONE MOBILE-FRIENDLY */}
        <nav style={styles.nav}>
          <button
            style={activeTab === 'club' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('club')}
          >
            🏆 IL CLUB ({clubMovies.length})
          </button>
          <button
            style={activeTab === 'watchlist' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('watchlist')}
          >
            📌 DA VEDERE ({watchlistMovies.length})
          </button>
          <button
            style={activeTab === 'evaluate' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('evaluate')}
          >
            ⭐ VALUTA {evaluableMoviesForActiveVoter.length > 0 && `(${evaluableMoviesForActiveVoter.length})`}
          </button>
          <button
            style={activeTab === 'library' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('library')}
          >
            📚 LIBRERIA
          </button>
        </nav>
      </header>

      {/* 1. PAGINA: IL CLUB */}
      {activeTab === 'club' && (
        <section style={styles.section}>
          <div style={styles.sectionHeaderFlex}>
            <h2 style={styles.sectionTitle}>🏆 Classifica "Il Club"</h2>
            
            {clubMovies.length > 0 && (
              <div style={styles.sortContainer}>
                <label style={styles.sortLabel}>Ordina per:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={styles.sortSelect}
                >
                  <option value="overall">⭐ Media Overall</option>
                  <option value="overall_giulio">👨 Overall Giulio</option>
                  <option value="overall_franci">👩 Overall Franci</option>
                  {RATING_CATEGORIES.filter(c => c.key !== 'overall').map(cat => (
                    <option key={cat.key} value={cat.key}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>

                <button
                  style={styles.sortOrderBtn}
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                >
                  {sortOrder === 'desc' ? '⬇️ Dal più alto' : '⬆️ Dal più basso'}
                </button>
              </div>
            )}
          </div>

          {clubMovies.length === 0 ? (
            <p style={styles.emptyText}>La classifica è vuota. Inserite sia la valutazione di Giulio che di Franci per pubblicare un film qui!</p>
          ) : (
            <div style={styles.grid}>
              {sortedClubMovies.map((movie, index) => {
                const overallAvg = getMovieScore(movie, 'overall').toFixed(1);
                const currentSortedScore = getMovieScore(movie, sortBy).toFixed(1);
                const selectedCatObj = RATING_CATEGORIES.find(c => c.key === sortBy);
                const isExpanded = expandedMovieId === movie.id;

                return (
                  <div key={movie.id} style={styles.card}>
                    <div style={styles.rankBadge}>#{index + 1}</div>
                    <img src={movie.poster_path || 'https://via.placeholder.com/300x450?text=No+Poster'} alt={movie.title} style={styles.poster} />
                    <div style={styles.cardContent}>
                      <h3 style={styles.movieTitle}>{movie.title}</h3>
                      <p style={styles.movieYear}>{movie.release_year}</p>

                      <div style={styles.badgeRating}>⭐ Media Overall: {overallAvg} / 10</div>

                      {sortBy !== 'overall' && selectedCatObj && (
                        <div style={styles.sortedCategoryBadge}>
                          {selectedCatObj.icon} {selectedCatObj.label}: <strong>{currentSortedScore} / 10</strong>
                        </div>
                      )}

                      <div style={styles.voterBox}>
                        <p style={{ margin: '2px 0', fontWeight: 'bold', color: '#64b5f6' }}>
                          👨 Giulio Overall: {movie.ratings_giulio?.overall || '-'}
                        </p>
                        <p style={{ margin: '2px 0', fontWeight: 'bold', color: '#f48fb1' }}>
                          👩 Franci Overall: {movie.ratings_franci?.overall || '-'}
                        </p>
                      </div>

                      {movie.notes && <p style={styles.notes}>"{movie.notes}"</p>}

                      <button
                        style={styles.btnToggleDetails}
                        onClick={() => setExpandedMovieId(isExpanded ? null : movie.id)}
                      >
                        {isExpanded ? '▲ Nascondi categorie' : '📊 Mostra 8 categorie'}
                      </button>

                      {isExpanded && (
                        <div style={styles.expandedCategoryBox}>
                          {RATING_CATEGORIES.map(cat => (
                            <div key={cat.key} style={styles.expandedCategoryRow}>
                              <span style={{ fontSize: '11px' }}>{cat.icon} {cat.label}:</span>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#e2c9a1' }}>
                                👨 {movie.ratings_giulio?.[cat.key] ?? '-'} | 👩 {movie.ratings_franci?.[cat.key] ?? '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <button style={styles.btnDanger} onClick={() => deleteMovie(movie.id, movie.title)}>
                        🗑️ Rimuovi
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 2. PAGINA: DA VEDERE */}
      {activeTab === 'watchlist' && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitleSpaced}>📌 Film da vedere insieme</h2>
          {watchlistMovies.length === 0 ? (
            <p style={styles.emptyText}>Nessun film in lista. Aggiungine qualcuno dalla Libreria!</p>
          ) : (
            <div style={styles.grid}>
              {watchlistMovies.map(movie => (
                <div key={movie.id} style={styles.card}>
                  <img src={movie.poster_path || 'https://via.placeholder.com/300x450?text=No+Poster'} alt={movie.title} style={styles.poster} />
                  <div style={styles.cardContent}>
                    <h3 style={styles.movieTitle}>{movie.title}</h3>
                    <p style={styles.movieYear}>{movie.release_year}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button style={styles.btnPrimary} onClick={() => markAsSeenPending(movie)}>
                        👁️ Segna come Visto
                      </button>
                      <button style={styles.btnDanger} onClick={() => deleteMovie(movie.id, movie.title)}>
                        🗑️ Rimuovi
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. PAGINA: VALUTA */}
      {activeTab === 'evaluate' && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitleSpaced}>⭐ Inserisci Valutazione</h2>
          <div style={styles.formContainer}>
            
            <label style={styles.label}>Chi sta votando adesso?</label>
            <div style={styles.voterToggleContainer}>
              <button
                type="button"
                style={activeVoter === 'giulio' ? styles.voterButtonActiveGiulio : styles.voterButton}
                onClick={() => { setActiveVoter('giulio'); setSelectedMovieToEvaluate(''); }}
              >
                👨 Giulio
              </button>
              <button
                type="button"
                style={activeVoter === 'franci' ? styles.voterButtonActiveFranci : styles.voterButton}
                onClick={() => { setActiveVoter('franci'); setSelectedMovieToEvaluate(''); }}
              >
                👩 Franci
              </button>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Seleziona il film da valutare per {activeVoter === 'giulio' ? 'Giulio' : 'Franci'}:
              </label>
              <select
                value={selectedMovieToEvaluate}
                onChange={(e) => setSelectedMovieToEvaluate(e.target.value)}
                style={styles.select}
              >
                <option value="">-- Seleziona un film da votare --</option>
                {evaluableMoviesForActiveVoter.map(movie => (
                  <option key={movie.id} value={movie.id}>
                    {movie.title} ({movie.release_year})
                  </option>
                ))}
              </select>
              {evaluableMoviesForActiveVoter.length === 0 && (
                <p style={{ color: '#aaa', fontSize: '13px', marginTop: '6px' }}>
                  Nessun film in attesa di voto per {activeVoter === 'giulio' ? 'Giulio' : 'Franci'}.
                </p>
              )}
            </div>

            {selectedMovieObject && (
              <div style={styles.previewBox}>
                <img src={selectedMovieObject.poster_path || 'https://via.placeholder.com/100x150?text=No+Poster'} alt={selectedMovieObject.title} style={styles.previewPoster} />
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#e2c9a1', fontSize: '16px' }}>{selectedMovieObject.title}</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#aaa' }}>{selectedMovieObject.overview?.substring(0, 110)}...</p>
                </div>
              </div>
            )}

            {/* CATEGORIE DI VALUTAZIONE */}
            <div style={{ marginTop: '20px', borderTop: '1px solid #332124', paddingTop: '15px' }}>
              <h3 style={{ fontSize: '16px', color: '#e2c9a1', marginBottom: '16px' }}>
                Voti di {activeVoter === 'giulio' ? 'Giulio' : 'Franci'} (da 1 a 10):
              </h3>
              
              {RATING_CATEGORIES.map(cat => (
                <div key={cat.key} style={styles.sliderGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                    <span>{cat.icon} {cat.label}</span>
                    <strong style={{ color: '#a81c24', fontSize: '16px' }}>{ratings[cat.key]} / 10</strong>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={ratings[cat.key]}
                    onChange={(e) => setRatings({ ...ratings, [cat.key]: parseFloat(e.target.value) })}
                    style={styles.slider}
                  />
                </div>
              ))}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Note / Commento personale:</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={styles.textarea}
                placeholder="Cosa ne pensi di questo film?"
              />
            </div>

            <button style={styles.btnPrimaryFull} onClick={handleSaveEvaluation}>
              💾 Salva Voto di {activeVoter === 'giulio' ? 'Giulio' : 'Franci'}
            </button>
          </div>
        </section>
      )}

      {/* 4. PAGINA: LIBRERIA */}
      {activeTab === 'library' && (
        <section style={styles.section}>
          <div style={styles.searchBarContainer}>
            <input
              type="text"
              placeholder="🔍 Cerca un film su TMDB..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            <select
              value={selectedGenre}
              onChange={(e) => { setSearchQuery(''); setSelectedGenre(e.target.value); }}
              style={styles.genreSelect}
            >
              {GENRES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          {loading ? (
            <p style={styles.loadingText}>Caricamento film dal catalogo...</p>
          ) : (
            <div style={styles.grid}>
              {tmdbResults.map(movie => {
                const existingList = getMovieExistingList(movie.id);
                return (
                  <div key={movie.id} style={styles.card}>
                    <img
                      src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster'}
                      alt={movie.title}
                      style={styles.poster}
                    />
                    <div style={styles.cardContent}>
                      <h3 style={styles.movieTitle}>{movie.title}</h3>
                      <p style={styles.movieYear}>{movie.release_date ? movie.release_date.substring(0, 4) : ''}</p>
                      
                      {existingList ? (
                        <div style={styles.alreadyInBadge}>In lista: {existingList}</div>
                      ) : (
                        <div style={styles.cardActions}>
                          <button style={styles.btnSecondary} onClick={() => addToWatchlist(movie)}>➕ Da Vedere</button>
                          <button style={styles.btnPrimary} onClick={() => markAsSeenPending(movie)}>👁️ Segna come Visto</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ==========================================
// STILI MOBILE-FIRST E CINEMATOGRAFICI
// ==========================================
const styles = {
  container: { fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#0e0d10', color: '#f4efe6', minHeight: '100vh', padding: '12px' },
  header: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' },
  bannerWrapper: { width: '100%', maxWidth: '950px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,0.8)', marginBottom: '16px', border: '1px solid #2d181c', backgroundColor: '#181419' },
  bannerImage: { width: '100%', height: 'auto', display: 'block' },
  
  // NAVBAR MOBILE FRIENDLY
  nav: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', backgroundColor: '#181419', padding: '8px', borderRadius: '10px', border: '1px solid #332124', width: '100%', maxWidth: '950px', boxSizing: 'border-box' },
  tab: { backgroundColor: '#251e24', color: '#e2c9a1', border: '1px solid #3d2b30', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', minHeight: '42px' },
  activeTab: { backgroundColor: '#a81c24', color: '#ffffff', border: '1px solid #e2c9a1', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 0 12px rgba(168, 28, 36, 0.7)', minHeight: '42px' },
  
  section: { maxWidth: '1000px', margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  sectionHeaderFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '28px', borderBottom: '1px solid #2d181c', paddingBottom: '12px' },
  sectionTitle: { fontSize: '22px', margin: 0, color: '#e2c9a1', borderLeft: '4px solid #a81c24', paddingLeft: '10px' },
  sectionTitleSpaced: { fontSize: '22px', margin: '0 0 32px 0', color: '#e2c9a1', borderLeft: '4px solid #a81c24', paddingLeft: '10px' },
  
  sortContainer: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  sortLabel: { fontSize: '13px', color: '#e2c9a1', fontWeight: 'bold' },
  sortSelect: { padding: '8px 10px', borderRadius: '8px', border: '1px solid #4a282e', backgroundColor: '#1f181d', color: '#fff', fontSize: '14px', minHeight: '40px' },
  sortOrderBtn: { padding: '8px 10px', borderRadius: '8px', border: '1px solid #4a282e', backgroundColor: '#2d181c', color: '#e2c9a1', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', minHeight: '40px' },

  searchBarContainer: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  searchInput: { flex: '1 1 200px', padding: '12px', borderRadius: '8px', border: '1px solid #332124', backgroundColor: '#181419', color: '#fff', fontSize: '16px', minHeight: '44px' },
  genreSelect: { flex: '0 0 140px', padding: '12px', borderRadius: '8px', border: '1px solid #332124', backgroundColor: '#181419', color: '#fff', fontSize: '16px', minHeight: '44px' },
  
  // GRIGLIA ADATTIVA PER SMARTPHONE (2 PER RIGA)
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px' },
  card: { position: 'relative', backgroundColor: '#181419', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 14px rgba(0,0,0,0.5)', border: '1px solid #2d1a1e' },
  rankBadge: { position: 'absolute', top: '8px', left: '8px', backgroundColor: '#a81c24', color: '#fff', fontWeight: 'bold', padding: '3px 8px', borderRadius: '14px', fontSize: '11px', border: '1px solid #e2c9a1', zIndex: 2 },
  poster: { width: '100%', aspectRatio: '2/3', objectFit: 'cover' },
  cardContent: { padding: '10px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' },
  movieTitle: { margin: '0 0 2px 0', fontSize: '15px', fontWeight: 'bold', color: '#fff', lineHeight: '1.2' },
  movieYear: { color: '#a69d8d', fontSize: '12px', margin: '0 0 8px 0' },
  cardActions: { display: 'flex', flexDirection: 'column', gap: '6px' },
  
  btnPrimary: { backgroundColor: '#a81c24', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', minHeight: '40px' },
  btnPrimaryFull: { backgroundColor: '#a81c24', color: '#fff', border: '1px solid #e2c9a1', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '16px', marginTop: '20px', minHeight: '48px', boxShadow: '0 4px 15px rgba(168, 28, 36, 0.4)' },
  btnSecondary: { backgroundColor: '#2b2126', color: '#e2c9a1', border: '1px solid #4a2d33', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', minHeight: '38px' },
  btnDanger: { backgroundColor: '#2d1416', color: '#ff6b6b', border: '1px solid #541d22', padding: '6px', borderRadius: '6px', cursor: 'pointer', marginTop: '8px', fontSize: '11px', minHeight: '36px' },
  btnToggleDetails: { backgroundColor: '#251c22', color: '#e2c9a1', border: '1px dashed #4d3339', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', marginTop: '6px' },
  
  alreadyInBadge: { backgroundColor: '#22191d', color: '#e2c9a1', padding: '6px', borderRadius: '6px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', border: '1px solid #3d272c' },
  badgeRating: { backgroundColor: '#e2c9a1', color: '#181419', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', display: 'inline-block', marginBottom: '6px', fontSize: '12px' },
  sortedCategoryBadge: { backgroundColor: '#a81c24', color: '#fff', padding: '4px 6px', borderRadius: '6px', fontSize: '11px', marginBottom: '6px' },
  
  voterBox: { backgroundColor: '#221a20', padding: '6px', borderRadius: '6px', marginBottom: '6px', fontSize: '12px', border: '1px solid #302025' },
  expandedCategoryBox: { backgroundColor: '#120e11', padding: '8px', borderRadius: '6px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid #302025' },
  expandedCategoryRow: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #221a20', paddingBottom: '2px' },
  notes: { fontStyle: 'italic', fontSize: '11px', color: '#c5baa9', margin: '0 0 6px 0', borderLeft: '2px solid #a81c24', paddingLeft: '6px' },
  
  formContainer: { backgroundColor: '#181419', padding: '18px', borderRadius: '12px', maxWidth: '500px', margin: '0 auto', boxShadow: '0 6px 20px rgba(0,0,0,0.6)', border: '1px solid #2d1a1e', boxSizing: 'border-box' },
  voterToggleContainer: { display: 'flex', gap: '8px', marginBottom: '18px', marginTop: '6px' },
  voterButton: { flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #3d272c', backgroundColor: '#22191d', color: '#a69d8d', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', minHeight: '44px' },
  voterButtonActiveGiulio: { flex: 1, padding: '12px', borderRadius: '8px', border: '2px solid #64b5f6', backgroundColor: '#1565c0', color: '#fff', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', minHeight: '44px', boxShadow: '0 0 10px rgba(33, 150, 243, 0.4)' },
  voterButtonActiveFranci: { flex: 1, padding: '12px', borderRadius: '8px', border: '2px solid #f48fb1', backgroundColor: '#ad1457', color: '#fff', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', minHeight: '44px', boxShadow: '0 0 10px rgba(233, 30, 99, 0.4)' },
  
  formGroup: { marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' },
  sliderGroup: { marginBottom: '14px', display: 'flex', flexDirection: 'column' },
  slider: { width: '100%', accentColor: '#a81c24', cursor: 'pointer', height: '28px' },
  label: { fontSize: '14px', fontWeight: 'bold', color: '#e2c9a1' },
  select: { padding: '12px', borderRadius: '8px', border: '1px solid #3d272c', backgroundColor: '#110d10', color: '#fff', fontSize: '16px', minHeight: '44px' },
  textarea: { padding: '12px', borderRadius: '8px', border: '1px solid #3d272c', backgroundColor: '#110d10', color: '#fff', fontSize: '16px', height: '80px' },
  previewBox: { display: 'flex', gap: '12px', backgroundColor: '#221a20', padding: '10px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #382429' },
  previewPoster: { width: '55px', height: '82px', objectFit: 'cover', borderRadius: '4px' },
  loadingText: { textAlign: 'center', color: '#a69d8d', margin: '40px 0' },
  emptyText: { color: '#a69d8d', fontStyle: 'italic' }
};