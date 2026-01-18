const tmdbService = require('./tmdbService');

class CalendarService {
  // Generate iCal/ICS format for universal calendar support
  generateICS(eventData) {
    const {
      movieTitle,
      watchDateTime,
      duration, // in minutes
      groupName,
      sessionId,
      movieDetails,
      streamingLinks,
      groupMembers
    } = eventData;

    // Format dates for iCal (YYYYMMDDTHHmmssZ)
    const startDate = new Date(watchDateTime);
    const endDate = new Date(startDate.getTime() + duration * 60000);

    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const dtStart = formatDate(startDate);
    const dtEnd = formatDate(endDate);
    const dtStamp = formatDate(new Date());

    // Generate unique UID
    const uid = `session-${sessionId}-${Date.now()}@movie-suggestion-app`;

    // Build description with movie details and links
    let description = `Join your group "${groupName}" to watch ${movieTitle}!\\n\\n`;

    if (movieDetails) {
      description += `${movieDetails.tagline ? movieDetails.tagline + '\\n\\n' : ''}`;
      description += `Rating: ${movieDetails.vote_average}/10\\n`;
      description += `Runtime: ${Math.floor(duration / 60)}h ${duration % 60}m\\n\\n`;
      description += `${movieDetails.overview}\\n\\n`;
    }

    // Add streaming availability
    if (streamingLinks && streamingLinks.length > 0) {
      description += `Watch on:\\n`;
      streamingLinks.forEach(link => {
        description += `- ${link.name}\\n`;
      });
      description += '\\n';
    }

    // Add deep link to session
    description += `Open in app: ${process.env.APP_URL || 'http://localhost:3000'}/session/${sessionId}\\n\\n`;

    // Add group members
    if (groupMembers && groupMembers.length > 0) {
      description += `Watching with:\\n`;
      groupMembers.forEach(member => {
        description += `- ${member.username}\\n`;
      });
    }

    // Build location field with streaming info
    let location = 'Online';
    if (streamingLinks && streamingLinks.length > 0) {
      location = `Streaming on ${streamingLinks[0].name}`;
    }

    // Generate ICS content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Movie Suggestion App//Movie Watch Event//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:Watch ${movieTitle} with ${groupName}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Movie watch party starts in 1 hour!',
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Movie watch party starts in 15 minutes!',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  }

  // Generate Google Calendar URL
  generateGoogleCalendarUrl(eventData) {
    const {
      movieTitle,
      watchDateTime,
      duration,
      groupName,
      sessionId,
      movieDetails,
      streamingLinks,
    } = eventData;

    const startDate = new Date(watchDateTime);
    const endDate = new Date(startDate.getTime() + duration * 60000);

    // Format: YYYYMMDDTHHmmssZ
    const formatGoogleDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;

    // Build description
    let details = `Join your group "${groupName}" to watch ${movieTitle}!\n\n`;

    if (movieDetails) {
      details += `${movieDetails.tagline ? movieDetails.tagline + '\n\n' : ''}`;
      details += `Rating: ${movieDetails.vote_average}/10\n`;
      details += `Runtime: ${Math.floor(duration / 60)}h ${duration % 60}m\n\n`;
      details += `${movieDetails.overview}\n\n`;
    }

    if (streamingLinks && streamingLinks.length > 0) {
      details += `Watch on:\n`;
      streamingLinks.forEach(link => {
        details += `- ${link.name}\n`;
      });
      details += '\n';
    }

    details += `Open in app: ${process.env.APP_URL || 'http://localhost:3000'}/session/${sessionId}`;

    // Build location
    let location = 'Online';
    if (streamingLinks && streamingLinks.length > 0) {
      location = `Streaming on ${streamingLinks[0].name}`;
    }

    // Encode parameters
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Watch ${movieTitle} with ${groupName}`,
      dates: dates,
      details: details,
      location: location,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  // Generate Apple Calendar webcal URL (points to ICS endpoint)
  generateAppleCalendarUrl(sessionId) {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    // Convert http to webcal protocol for Apple Calendar
    const webcalUrl = baseUrl.replace('http://', 'webcal://').replace('https://', 'webcal://');
    return `${webcalUrl}/api/sessions/${sessionId}/calendar.ics`;
  }

  // Prepare event data from session
  async prepareEventData(session, userId = null) {
    const db = require('../database');

    return new Promise(async (resolve, reject) => {
      try {
        // Get movie details
        const movieSuggestion = await new Promise((res, rej) => {
          db.get(
            'SELECT * FROM movie_suggestions WHERE id = ?',
            [session.selected_movie_id],
            (err, row) => {
              if (err) rej(err);
              else res(row);
            }
          );
        });

        if (!movieSuggestion) {
          return reject(new Error('Movie not found'));
        }

        // Get group info
        const group = await new Promise((res, rej) => {
          db.get(
            'SELECT * FROM groups WHERE id = ?',
            [session.group_id],
            (err, row) => {
              if (err) rej(err);
              else res(row);
            }
          );
        });

        // Get group members
        const groupMembers = await new Promise((res, rej) => {
          db.all(
            `SELECT u.username FROM group_members gm
             INNER JOIN users u ON gm.user_id = u.id
             WHERE gm.group_id = ?`,
            [session.group_id],
            (err, rows) => {
              if (err) rej(err);
              else res(rows);
            }
          );
        });

        // Determine watch date/time
        let watchDateTime;
        if (session.watch_model === 'party' && session.scheduled_watch_time) {
          watchDateTime = session.scheduled_watch_time;
        } else if (session.watch_model === 'solo' && userId) {
          // Get user's personal watch date
          const watchStatus = await new Promise((res, rej) => {
            db.get(
              'SELECT personal_watch_date FROM user_watch_status WHERE session_id = ? AND user_id = ?',
              [session.id, userId],
              (err, row) => {
                if (err) rej(err);
                else res(row);
              }
            );
          });
          watchDateTime = watchStatus?.personal_watch_date;
        }

        if (!watchDateTime) {
          return reject(new Error('No watch date/time set'));
        }

        // Get full movie details from TMDB
        let movieDetails = null;
        let streamingLinks = [];
        let duration = 120; // default 2 hours

        if (movieSuggestion.tmdb_id) {
          try {
            movieDetails = await tmdbService.getMovieDetails(movieSuggestion.tmdb_id);
            duration = movieDetails.runtime || 120;

            // Get streaming providers
            const providers = await tmdbService.getWatchProviders(movieSuggestion.tmdb_id);
            if (providers && providers.flatrate) {
              streamingLinks = providers.flatrate;
            }
          } catch (err) {
            console.error('Error fetching TMDB data for calendar:', err);
          }
        }

        resolve({
          movieTitle: movieSuggestion.movie_title,
          watchDateTime,
          duration,
          groupName: group.name,
          sessionId: session.id,
          movieDetails,
          streamingLinks,
          groupMembers
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new CalendarService();
