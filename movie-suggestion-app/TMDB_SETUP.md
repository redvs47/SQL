# TMDB API Setup Guide

The Movie Suggestion App uses The Movie Database (TMDB) API to provide movie information, posters, ratings, cast details, and streaming availability. Follow these steps to get your free API key.

## Step 1: Create a TMDB Account

1. Go to [The Movie Database](https://www.themoviedb.org/)
2. Click "Join TMDB" in the top right corner
3. Fill out the registration form with your email and create a password
4. Verify your email address by clicking the link sent to your inbox

## Step 2: Request an API Key

1. Log in to your TMDB account
2. Click on your profile icon in the top right
3. Select "Settings" from the dropdown menu
4. In the left sidebar, click on "API"
5. Click on "Request an API Key"

## Step 3: Choose API Type

1. You'll see two options:
   - **Developer** (Recommended for this app)
   - **Commercial**
2. Click "Developer" for non-commercial use
3. Accept the Terms of Use

## Step 4: Fill Out the Application Form

Fill in the required information:

- **Type of Use**: Select "Education" or "Personal"
- **Application Name**: "Movie Suggestion App" (or any name you prefer)
- **Application URL**: You can use "http://localhost:3000" for local development
- **Application Summary**:
  ```
  A collaborative movie suggestion application where groups can suggest movies,
  randomly select one to watch, and share video reviews. Uses TMDB for movie
  information, posters, and streaming availability.
  ```

Click "Submit" when done.

## Step 5: Get Your API Credentials

After submission, you'll immediately see your API credentials:

- **API Key (v3 auth)**: The old 32-character key (deprecated for most endpoints)
- **API Read Access Token (v4 auth)**: **This is what you need for this app**

Copy the **API Read Access Token (v4 auth)** - it will look something like:
```
eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhMWIyYzNkNGU1ZjZnN2g4aTlqMGsxbDJtM240bzVwNiIsInN1YiI6IjYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2NyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2
```

**Important**: The token starts with "eyJ" and is much longer than the old 32-character API key.

## Step 6: Add API Key to Your App

### For Backend Setup:

1. Navigate to the backend directory:
   ```bash
   cd movie-suggestion-app/backend
   ```

2. Open the `.env` file in a text editor

3. Find the line that says:
   ```
   TMDB_API_KEY=your-tmdb-api-key-here
   ```

4. Replace `your-tmdb-api-key-here` with your **Read Access Token** (not the old API key):
   ```
   TMDB_API_KEY=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhMWIyYzNkNGU1ZjZnN2g4aTlqMGsxbDJtM240bzVwNiIsInN1YiI6IjYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2NyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2
   ```

   **Note**: Make sure to use the long "Read Access Token" that starts with "eyJ", not the short 32-character API key.

5. Save the file

6. Restart your backend server if it's already running

## Step 7: Test the Integration

1. Start your backend server:
   ```bash
   npm start
   ```

2. The app should now be able to search for movies, display posters, and show movie details

3. Try searching for a movie in the app - you should see:
   - Movie posters
   - Release years
   - Ratings
   - Movie details when selected

## Troubleshooting

### "TMDB API key not configured" Error

**Problem**: You see this error when trying to search for movies

**Solution**:
- Make sure you added the API key to the `.env` file
- Ensure there are no extra spaces before or after the API key
- Restart the backend server after adding the key

### "Failed to search movies" Error

**Problem**: Searches are failing even with a valid API key

**Solutions**:
- Check your internet connection
- Verify the API key is correct (no typos)
- Make sure you're using the v3 API key, not the v4 token
- Check that you haven't exceeded TMDB's rate limits (40 requests per 10 seconds)

### Movies Not Loading or Blank Posters

**Problem**: Movie search works but images don't load

**Solutions**:
- Check browser console for CORS errors
- Verify the backend is running and accessible
- Clear browser cache and reload

### API Rate Limiting

TMDB has the following rate limits for free accounts:
- **40 requests per 10 seconds**
- **Unlimited total daily requests**

If you're building a high-traffic application, consider:
- Implementing caching for frequently accessed movies
- Storing TMDB data in your database (which this app already does)
- Upgrading to a commercial TMDB license if needed

## TMDB API Features Used

This app utilizes the following TMDB API endpoints:

1. **Movie Search** (`/search/movie`)
   - Autocomplete movie suggestions as users type
   - Returns: title, poster, release year, rating, overview

2. **Movie Details** (`/movie/{movie_id}`)
   - Full movie information page
   - Returns: all basic info plus cast, crew, trailer, genres

3. **Watch Providers** (`/movie/{movie_id}/watch/providers`)
   - Shows where movies are available to stream
   - Returns: streaming services, rental, and purchase options by region

## Additional Resources

- [TMDB API Documentation](https://developers.themoviedb.org/3)
- [TMDB API Support Forum](https://www.themoviedb.org/talk/category/5047958519c29526b50017d6)
- [TMDB API Status](https://status.themoviedb.org/)

## Privacy and Attribution

Per TMDB's Terms of Use:
- You must attribute TMDB as the source of the data
- Do not use TMDB data for commercial purposes without a commercial license
- Respect user privacy when handling movie viewing data

This app automatically includes TMDB attribution in the movie details pages.

## Need Help?

If you encounter issues:
1. Check the [TMDB API Status page](https://status.themoviedb.org/) for outages
2. Review your API key in the TMDB settings
3. Check the backend console logs for detailed error messages
4. Ensure all backend dependencies are installed (`npm install`)

---

**Ready to start!** Once your API key is configured, users can search for movies with autocomplete, view detailed information, and see where movies are available to stream.
