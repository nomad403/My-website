import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="mb-4 text-[4.25rem] font-normal leading-none">404</h1>
        <p className="mb-8 text-[1.625rem] leading-[1.16]">Page non trouvée</p>
        <Link 
          href="/" 
          className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
