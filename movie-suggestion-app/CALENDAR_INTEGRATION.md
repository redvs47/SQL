# Calendar Integration Guide

The Movie Suggestion App includes comprehensive calendar integration to help users never miss a movie watch party. Users can add watch times directly to their preferred calendar app.

## Supported Calendar Systems

✅ **Google Calendar** - Add events directly to Google Calendar
✅ **Apple Calendar** - Works on iPhone, iPad, and Mac
✅ **Outlook Calendar** - Via iCal/ICS import
✅ **Any ICS-compatible calendar** - Universal .ics file export

## How It Works

### For Party Mode (Synchronized Watching)
When the group votes and a watch time is set, users can add the scheduled time to their calendar with one click.

### For Solo Mode (Flexible Deadline)
Users set their personal watch date and can add it to their calendar for a reminder.

## Calendar Event Features

Each calendar event includes:

### Basic Information
- 📅 **Event Title**: "Watch [Movie Title] with [Group Name]"
- ⏰ **Start Time**: Scheduled watch time
- ⏱️ **Duration**: Actual movie runtime from TMDB (e.g., 2h 32m for The Dark Knight)
- 📍 **Location**: Streaming service name (if available)

### Rich Details
- 🎬 **Movie Overview**: Full description from TMDB
- ⭐ **Rating**: TMDB average rating
- 🏷️ **Tagline**: Movie tagline (if available)
- 👥 **Attendees**: List of all group members
- 🔗 **Deep Link**: Direct link to open the session in the app
- 📺 **Streaming Links**: Where to watch (Netflix, Amazon Prime, etc.)

### Smart Reminders
- **1 hour before**: "Movie watch party starts in 1 hour!"
- **15 minutes before**: "Movie watch party starts in 15 minutes!"

## API Endpoints

### 1. Download ICS File
```
GET /api/sessions/:sessionId/calendar.ics
```

**Response**: Downloads a .ics file compatible with all calendar applications

**Headers**:
- Content-Type: `text/calendar; charset=utf-8`
- Content-Disposition: `attachment; filename="watch-[movie-title].ics"`

**Usage**:
```javascript
// Direct download link
<a href={`/api/sessions/${sessionId}/calendar.ics`} download>
  Download ICS File
</a>
```

### 2. Google Calendar URL
```
GET /api/sessions/:sessionId/calendar/google-url
```

**Response**:
```json
{
  "url": "https://calendar.google.com/calendar/render?action=TEMPLATE&text=..."
}
```

**Usage**:
```javascript
const response = await fetch(`/api/sessions/${sessionId}/calendar/google-url`);
const { url } = await response.json();
window.open(url, '_blank'); // Opens Google Calendar add event page
```

### 3. Apple Calendar URL
```
GET /api/sessions/:sessionId/calendar/apple-url
```

**Response**:
```json
{
  "url": "webcal://localhost:3000/api/sessions/123/calendar.ics"
}
```

**Usage**:
```javascript
const response = await fetch(`/api/sessions/${sessionId}/calendar/apple-url`);
const { url } = await response.json();
window.location.href = url; // Opens Apple Calendar
```

## Frontend Implementation

### React Web App Example

```jsx
import React, { useState } from 'react';

function AddToCalendarButton({ sessionId }) {
  const [showMenu, setShowMenu] = useState(false);

  const handleGoogleCalendar = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/calendar/google-url`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error adding to Google Calendar:', error);
    }
  };

  const handleAppleCalendar = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/calendar/apple-url`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error adding to Apple Calendar:', error);
    }
  };

  const handleDownloadICS = () => {
    window.location.href = `/api/sessions/${sessionId}/calendar.ics`;
  };

  return (
    <div className="calendar-button-container">
      <button onClick={() => setShowMenu(!showMenu)}>
        📅 Add to Calendar
      </button>

      {showMenu && (
        <div className="calendar-dropdown">
          <button onClick={handleGoogleCalendar}>
            Google Calendar
          </button>
          <button onClick={handleAppleCalendar}>
            Apple Calendar
          </button>
          <button onClick={handleDownloadICS}>
            Download ICS File
          </button>
        </div>
      )}
    </div>
  );
}
```

### Flutter Mobile App Example

```dart
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class AddToCalendarButton extends StatelessWidget {
  final int sessionId;
  final String token;

  const AddToCalendarButton({
    required this.sessionId,
    required this.token,
  });

  Future<void> _addToGoogleCalendar(BuildContext context) async {
    try {
      final response = await http.get(
        Uri.parse('http://your-api.com/api/sessions/$sessionId/calendar/google-url'),
        headers: {'Authorization': 'Bearer $token'},
      );

      final data = json.decode(response.body);
      final url = Uri.parse(data['url']);

      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${e.toString()}')),
      );
    }
  }

  Future<void> _downloadICS(BuildContext context) async {
    final url = Uri.parse('http://your-api.com/api/sessions/$sessionId/calendar.ics');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      child: ElevatedButton.icon(
        icon: Icon(Icons.calendar_today),
        label: Text('Add to Calendar'),
        onPressed: null,
      ),
      onSelected: (String choice) async {
        if (choice == 'google') {
          await _addToGoogleCalendar(context);
        } else if (choice == 'ics') {
          await _downloadICS(context);
        }
      },
      itemBuilder: (BuildContext context) => [
        PopupMenuItem(value: 'google', child: Text('Google Calendar')),
        PopupMenuItem(value: 'ics', child: Text('Download ICS File')),
      ],
    );
  }
}
```

## When to Show "Add to Calendar"

Display the calendar integration button when:

✅ **Party Mode**: After watch time voting is complete and time is set
✅ **Solo Mode**: After user sets their personal watch date
✅ Session status is `watching` (movie selected, time/date set)
❌ Don't show during `collecting_suggestions` or `reviewed` stages

## Example Event in Calendar

```
Title: Watch The Dark Knight with Movie Buffs

Date: Saturday, January 25, 2026
Time: 8:00 PM - 10:32 PM (2h 32m)

Location: Streaming on Netflix

Description:
Join your group "Movie Buffs" to watch The Dark Knight!

Why So Serious?

Rating: 9.0/10
Runtime: 2h 32m

When the menace known as the Joker wreaks havoc and chaos on
the people of Gotham, Batman must accept one of the greatest
psychological and physical tests of his ability to fight injustice.

Watch on:
- Netflix
- Amazon Prime Video

Open in app: http://localhost:3000/session/42

Watching with:
- John Smith
- Sarah Johnson
- Mike Davis
- Emily Brown

Reminders:
- 1 hour before
- 15 minutes before
```

## Configuration

### Environment Variables

Add to `.env`:
```bash
APP_URL=http://localhost:3000  # Your frontend URL (for deep links)
```

For production, change to your actual domain:
```bash
APP_URL=https://yourdomain.com
```

## Troubleshooting

### ICS File Not Downloading

**Problem**: Clicking download does nothing

**Solution**:
- Check that the session has a watch date/time set
- Verify user is authenticated (JWT token in headers)
- Check browser console for errors
- Ensure backend server is running

### Google Calendar Opens But Event is Wrong

**Problem**: Event details are incorrect or missing

**Solution**:
- Verify TMDB API key is configured correctly
- Check that movie has TMDB data (tmdb_id is set)
- Look at backend logs for TMDB API errors
- Ensure streaming provider data is available

### Apple Calendar Doesn't Open

**Problem**: webcal:// link doesn't work

**Solution**:
- Webcal only works on devices with Apple Calendar installed
- On web browsers, use the ICS download instead
- Check that APP_URL in .env is correct

### Events Missing Movie Details

**Problem**: Calendar event shows but missing description, runtime, streaming links

**Solution**:
- Movie must have a valid TMDB ID in the database
- Check TMDB API rate limits (40 requests per 10 seconds)
- Verify internet connection to TMDB API
- Check backend logs for TMDB errors

### Deep Links Don't Open App

**Problem**: Clicking event link goes to wrong URL

**Solution**:
- Update `APP_URL` in `.env` to match your frontend URL
- For mobile, implement deep link handling in the app
- Test with correct protocol (http/https)

## Testing Calendar Integration

### Manual Testing Checklist

1. **Party Mode**:
   - [ ] Create party mode session
   - [ ] Vote on watch time
   - [ ] Click "Add to Calendar"
   - [ ] Verify event shows correct date/time
   - [ ] Check event includes all movie details
   - [ ] Confirm reminders work

2. **Solo Mode**:
   - [ ] Create solo mode session
   - [ ] Set personal watch date
   - [ ] Click "Add to Calendar"
   - [ ] Verify event shows personal date
   - [ ] Check event includes movie details

3. **Different Calendars**:
   - [ ] Test Google Calendar
   - [ ] Test Apple Calendar (iOS/Mac)
   - [ ] Test ICS download with Outlook
   - [ ] Test ICS download with other calendar apps

4. **Event Details**:
   - [ ] Movie title correct
   - [ ] Duration matches movie runtime
   - [ ] Streaming providers listed
   - [ ] Deep link works
   - [ ] Group members listed
   - [ ] Reminders fire correctly

## Best Practices

1. **Show Availability**: Display calendar button only when date/time is set
2. **Clear Labels**: Use descriptive button text like "Add to Calendar" not just an icon
3. **Multiple Options**: Offer Google, Apple, and ICS download options
4. **Error Handling**: Show user-friendly error messages if calendar add fails
5. **Loading States**: Show loading indicator while generating calendar URLs
6. **Success Feedback**: Confirm to user that event was added successfully

## Future Enhancements

Possible future improvements:
- Automatic calendar sync without user action
- Calendar event updates when watch time changes
- Google Calendar API for direct add (requires OAuth)
- Recurring events for weekly movie nights
- Time zone handling for international groups
- Calendar availability checking before voting

---

**Questions?** Check the backend logs at `backend/server.js` lines 1304-1383 for calendar endpoint implementation.
