import { Link } from 'react-router-dom';
import { useAuth } from '../App';

export default function Home() {
  const { token, user } = useAuth();

  return (
    <section className="page-card">
      <h1>Welcome to AI Study Assistant</h1>
      {token ? (
        <>
          <p>Welcome back, {user?.name || 'student'}. Continue building your study sessions.</p>
          <div>
            <Link to="/dashboard"><button>Go to Dashboard</button></Link>
            <Link to="/study-session"><button>New Study Session</button></Link>
          </div>
        </>
      ) : (
        <>
          <p>Organize your study sessions, save notes, and review content efficiently.</p>
          <div>
            <Link to="/signup"><button>Sign Up</button></Link>
            <Link to="/login"><button>Login</button></Link>
          </div>
        </>
      )}
    </section>
  );
}
