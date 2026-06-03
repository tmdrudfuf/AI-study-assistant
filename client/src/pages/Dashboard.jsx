import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <section className="page-card">
      <h1>Dashboard</h1>
      <p>View your study sessions and start a new session.</p>
      <Link to="/study-session"><button>Start Study Session</button></Link>
    </section>
  );
}
