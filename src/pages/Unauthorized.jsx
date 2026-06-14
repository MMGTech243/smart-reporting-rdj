import { useNavigate } from 'react-router-dom';

export default function Unauthorized() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-cnssap-bg flex flex-col items-center justify-center text-center p-8">
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-xl font-bold text-white mb-2">Accès refusé</h1>
      <p className="text-cnssap-muted mb-6 text-sm">
        Vous n'avez pas les droits nécessaires pour accéder à cette page.
      </p>
      <button
        onClick={() => navigate(-1)}
        className="px-6 py-2.5 bg-cnssap-primary hover:bg-cnssap-hover text-white rounded-lg text-sm font-medium transition-colors"
      >
        Retour
      </button>
    </div>
  );
}
