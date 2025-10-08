import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';

// Discord OAuth 설정
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID!,
  clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  callbackURL: process.env.DISCORD_CALLBACK_URL || '/auth/discord/callback',
  scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
  // 사용자 정보 저장
  const user = {
    id: profile.id,
    username: profile.username,
    discriminator: profile.discriminator,
    avatar: profile.avatar,
    guilds: profile.guilds || []
  };
  
  return done(null, user);
}));

// 세션에 사용자 ID 저장
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// 세션에서 사용자 정보 복원
passport.deserializeUser(async (id: string, done) => {
  // 실제로는 데이터베이스에서 사용자 정보를 조회해야 하지만,
  // 여기서는 간단히 세션에서 저장된 정보를 사용
  done(null, { id });
});

export default passport;