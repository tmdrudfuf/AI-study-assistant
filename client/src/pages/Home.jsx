import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <section className="page-card">
      <h1>Welcome to AI Study Assistant</h1>
      <p>Organize your study sessions, save notes, and review content efficiently.</p>
      <div>
        <Link to="/signup"><button>Sign Up</button></Link>
        <Link to="/login"><button>Login</button></Link>
      </div>
    </section>
  );
}
