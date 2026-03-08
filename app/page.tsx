import LandingNavbar    from '@/components/landing/Navbar'
import LandingHero       from '@/components/landing/Hero'
import LandingTrustBar   from '@/components/landing/TrustBar'
import LandingHowItWorks from '@/components/landing/HowItWorks'
import LandingAgents     from '@/components/landing/Agents'
import LandingFeatures   from '@/components/landing/Features'
import LandingPricing    from '@/components/landing/Pricing'
import LandingFAQ        from '@/components/landing/FAQ'
import LaunchSection     from '@/components/landing/LaunchSection'
import LandingFooter     from '@/components/landing/Footer'

export default function HomePage() {
  return (
    <div className="bg-[#fafafa] text-gray-900 selection:bg-indigo-600 selection:text-white">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingTrustBar />
        <LandingHowItWorks />
        <LandingAgents />
        <LandingFeatures />
        <LandingPricing />
        <LandingFAQ />
        <LaunchSection />
      </main>
      <LandingFooter />
    </div>
  )
}
