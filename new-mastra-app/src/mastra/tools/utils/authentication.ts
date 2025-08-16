/**
 * Function to get authorization token
 * 
 * To-Do: Store the auth token in a secure way. 
 * So that we do not need to re-authenticate every time.
 * @returns 
 */
export async function getHubAuthToken(dbCon: any): Promise<string> {
  try {
    console.log('Attempting to get authorization token...');

    // check token inside mongo db.
    const authToken = await dbCon.collection('token').find({}).toArray();

    // if token found, return it
    if (authToken.length > 0) {
      const token = authToken[0].token;
      console.log('Auth token found in mongo db:', token);
      return token;
    } else {
      console.log('Auth token not found in mongo db. Fetching token now...');
      // if token not found, get new token and store it in mongo db
      if (!process.env.HUB_API_URL) {
        throw new Error('HUB_API_URL environment variable is required');
      }
  
      if (!process.env.HUB_USER_EMAIL || !process.env.HUB_USER_PASSWORD) {
        throw new Error(
          'HUB_USER_EMAIL and HUB_USER_PASSWORD environment variables are required'
        );
      }
  
      const response = await fetch(`${process.env.HUB_API_URL}/api/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: process.env.HUB_USER_EMAIL,
          password: process.env.HUB_USER_PASSWORD,
        }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Authentication failed: ${response.status} ${response.statusText} - ${errorText}`
        );
      }
  
      const data = await response.json();
      // console.log('Authentication response:', data);
      const token = data.data.token;
      if (!token) {
        throw new Error('No token received in authentication response');
      }
  
      // store token in mongo db with expiry of 1 day/24 hrs from creation time
      // To-Do: check the expiry time of Hub API token and update the expiry time in mongo db accordingly
      const result = await dbCon.collection('token').insertOne({ token, createdAt: new Date(), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) });
      console.log('Token stored in mongo db:', result.insertedId);
  
      console.log('Successfully obtained authorization token');
      return token;
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw new Error(
      `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}