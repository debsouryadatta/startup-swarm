import { auth }           from '@/auth'
import { NextResponse }   from 'next/server'

export default auth(req => {
  const { pathname } = req.nextUrl

  // Protect dashboard — redirect unauthenticated users to home
  if (!req.auth && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', req.url))
  }
})

export const config = {
  matcher: ['/dashboard/:path*'],
}
