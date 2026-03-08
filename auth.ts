import NextAuth           from 'next-auth'
import Credentials        from 'next-auth/providers/credentials'
import bcrypt             from 'bcryptjs'
import { db }             from '@/db'
import { users }          from '@/db/schema'
import { eq }             from 'drizzle-orm'

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        })

        if (!user) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!passwordMatch) return null

        return { id: user.id, name: user.name, email: user.email }
      },
    }),
  ],
  pages: {
    signIn: '/',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
  session: { strategy: 'jwt' },
})
