import { Link } from 'react-router-dom';

function Index() {
  return (
    <main className="home-page">
      <section>
        <p className="eyebrow">School Clinic</p>
        <h1>Student and Staff Health Visit System</h1>
        <p>Record visits, monitor clinic activity, and keep common health concerns organized.</p>
        <div className="actions">
          <Link to="/login">Nurse Login</Link>
          <Link to="/student-entry">Student Entry</Link>
        </div>
      </section>
    </main>
  );
}

export default Index;
