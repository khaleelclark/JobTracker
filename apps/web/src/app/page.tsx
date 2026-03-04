import Link from "next/link";

export default function HomePage() {
  return (
    <section className="stack-xl">
      <div className="hero">
        <h1>Local Job Search Memory</h1>
        <p>
          Record facts and give GPT high-context inputs. The app stores truth only; reasoning
          stays with you and your models.
        </p>
      </div>

      <div className="grid grid-3">
        <div className="card interactive">
          <h2>Daily Command</h2>
          <p className="muted">Start in Today to review interviews and timeline activity.</p>
          <Link className="cta-link" href="/today">
            Open Today
          </Link>
        </div>

        <div className="card interactive">
          <h2>Capture Records</h2>
          <p className="muted">Use interactive forms to log applications, interviews, communication, and more.</p>
          <Link className="cta-link" href="/applications">
            Go To Applications
          </Link>
        </div>

        <div className="card interactive">
          <h2>Resume Vault</h2>
          <p className="muted">Upload or reference resume files and link them to opportunities.</p>
          <Link className="cta-link" href="/resumes">
            Open Resumes
          </Link>
        </div>
      </div>
    </section>
  );
}
