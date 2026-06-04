export const environment = {
  production: true,
  // DEV INSTANCE (portovi 10189, 10190) — za povratak na testnu instancu, zameni sa zakomentarisanim vrednostima ispod
  apiUrl:       'https://softeng.pmf.kg.ac.rs:10189/api',       // TESTNA: 'https://softeng.pmf.kg.ac.rs:10185/api'
  touristAppUrl:'https://softeng.pmf.kg.ac.rs:10190',           // TESTNA: 'https://softeng.pmf.kg.ac.rs:10187'
  adminAppUrl:  'https://softeng.pmf.kg.ac.rs:10188',
  googleClientId: '701119543171-s83jt4jk0lncvo69jtt6hh5jvp8k21ov.apps.googleusercontent.com',
  mcpUrl:       'https://softeng.pmf.kg.ac.rs:10186/mcp',
  // Gemini chat ide isključivo kroz naš .NET backend — nikada direktno ka Gemini API-ju
  chatApiUrl:   'https://softeng.pmf.kg.ac.rs:10186/api/chat',
};
