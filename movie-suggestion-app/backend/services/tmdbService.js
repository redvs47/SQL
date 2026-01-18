const axios = require('axios');

class TMDBService {
  constructor() {
    this.apiKey = process.env.TMDB_API_KEY;
    this.baseURL = 'https://api.themoviedb.org/3';
    this.imageBaseURL = 'https://image.tmdb.org/t/p';
  }

  // Search movies with autocomplete
  async searchMovies(query) {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    try {
      const response = await axios.get(`${this.baseURL}/search/movie`, {
        params: {
          api_key: this.apiKey,
          query: query,
          include_adult: false,
          language: 'en-US',
          page: 1
        }
      });

      return response.data.results.slice(0, 10).map(movie => ({
        tmdb_id: movie.id,
        title: movie.title,
        release_year: movie.release_date ? movie.release_date.substring(0, 4) : 'N/A',
        poster_path: movie.poster_path,
        poster_url: movie.poster_path
          ? `${this.imageBaseURL}/w185${movie.poster_path}`
          : null,
        vote_average: movie.vote_average,
        overview: movie.overview
      }));
    } catch (error) {
      console.error('TMDB search error:', error.message);
      throw new Error('Failed to search movies');
    }
  }

  // Get movie details by TMDB ID
  async getMovieDetails(tmdbId) {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    try {
      const response = await axios.get(`${this.baseURL}/movie/${tmdbId}`, {
        params: {
          api_key: this.apiKey,
          language: 'en-US',
          append_to_response: 'credits,videos,keywords'
        }
      });

      const movie = response.data;

      return {
        tmdb_id: movie.id,
        title: movie.title,
        release_year: movie.release_date ? movie.release_date.substring(0, 4) : 'N/A',
        release_date: movie.release_date,
        poster_path: movie.poster_path,
        poster_url: movie.poster_path
          ? `${this.imageBaseURL}/w500${movie.poster_path}`
          : null,
        backdrop_url: movie.backdrop_path
          ? `${this.imageBaseURL}/w1280${movie.backdrop_path}`
          : null,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
        overview: movie.overview,
        runtime: movie.runtime,
        genres: movie.genres,
        tagline: movie.tagline,
        cast: movie.credits?.cast?.slice(0, 10).map(person => ({
          name: person.name,
          character: person.character,
          profile_path: person.profile_path
            ? `${this.imageBaseURL}/w185${person.profile_path}`
            : null
        })),
        crew: movie.credits?.crew?.filter(person =>
          person.job === 'Director' || person.job === 'Producer' || person.job === 'Writer'
        ).map(person => ({
          name: person.name,
          job: person.job,
          profile_path: person.profile_path
            ? `${this.imageBaseURL}/w185${person.profile_path}`
            : null
        })),
        trailer: movie.videos?.results?.find(video =>
          video.type === 'Trailer' && video.site === 'YouTube'
        )
      };
    } catch (error) {
      console.error('TMDB details error:', error.message);
      throw new Error('Failed to get movie details');
    }
  }

  // Get watch providers by TMDB ID
  async getWatchProviders(tmdbId, region = 'US') {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    try {
      const response = await axios.get(`${this.baseURL}/movie/${tmdbId}/watch/providers`, {
        params: {
          api_key: this.apiKey
        }
      });

      const providers = response.data.results[region];

      if (!providers) {
        return null;
      }

      return {
        link: providers.link,
        flatrate: providers.flatrate?.map(provider => ({
          name: provider.provider_name,
          logo_url: `${this.imageBaseURL}/w92${provider.logo_path}`
        })),
        rent: providers.rent?.map(provider => ({
          name: provider.provider_name,
          logo_url: `${this.imageBaseURL}/w92${provider.logo_path}`
        })),
        buy: providers.buy?.map(provider => ({
          name: provider.provider_name,
          logo_url: `${this.imageBaseURL}/w92${provider.logo_path}`
        }))
      };
    } catch (error) {
      console.error('TMDB watch providers error:', error.message);
      return null;
    }
  }

  // Validate movie exists
  async validateMovie(tmdbId) {
    try {
      await this.getMovieDetails(tmdbId);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new TMDBService();
