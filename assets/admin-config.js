/* WallBliss admin settings that live in code.
   googleClientId: paste the OAuth Client ID from Google Cloud Console (see README → Google sign-in).
   While it is empty, the admin shows a simple name picker instead of Google sign-in. */
window.WB_ADMIN_CONFIG = {
  googleClientId: "720239373390-n1ms4kp2gd1uba1nrufo3999mim65131.apps.googleusercontent.com",
  /* Design originals in Google Drive (README → "Design originals"). apiKey: browser key restricted to
     wallbliss.in + Google Picker API. appId: the Cloud project number. account: the only Drive account allowed. */
  drive: {
    apiKey: "AIzaSyAyYrmYQjB0rAl0bN5jNjIZgxpkZFtEO-s",
    appId: "720239373390",
    account: "wallblissstudio@gmail.com",
    folderName: "Design originals"
  },
  allowed: {
    "anilkolla@gmail.com": "Anil",
    "manasa.doradla@gmail.com": "Manasa"
  }
};
