import ccakLogo from "@/assets/ccak-logo.png.asset.json";
import presidentSignature from "@/assets/president-signature.png.asset.json";

export type DigitalIdCardProps = {
  fullName: string;
  membershipCode: string;
  nationalId: string;
  county: string;
  photoUrl?: string | null;
  memberSince?: string;
  /** Display name of the authorising president (configurable). */
  presidentName?: string;
  /** Optional path/URL to a signature image. */
  presidentSignatureUrl?: string | null;
  motto?: string;
  objectives?: string[];
  className?: string;
};

const DEFAULT_MOTTO = "Empowering farmers. Elevating Kenyan coffee. Transforming the future.";
const DEFAULT_OBJECTIVES = [
  "Unite farmers, cooperatives and the wider coffee value chain.",
  "Promote quality, traceability and fair returns from farm gate to export.",
  "Build climate-smart, youth- and women-inclusive coffee enterprises.",
  "Strengthen county chapters and digital membership services.",
];

/**
 * Professional CCAK digital membership ID – front and back.
 * Designed for on-screen display and print (A6-ish ratio).
 */
export function DigitalIdCard({
  fullName,
  membershipCode,
  nationalId,
  county,
  photoUrl,
  memberSince,
  presidentName = "David Muigai Miringu",
  presidentSignatureUrl = presidentSignature.url,
  motto = DEFAULT_MOTTO,
  objectives = DEFAULT_OBJECTIVES,
  className = "",
}: DigitalIdCardProps) {
  return (
    <div className={`ccak-id-suite ${className}`}>
      {/* FRONT */}
      <article className="ccak-id-card ccak-id-front" aria-label="CCAK membership card front">
        <img src={ccakLogo.url} alt="" className="ccak-id-watermark" aria-hidden="true" />
        <header className="ccak-id-header">
          <div className="ccak-id-brand">
            <img src={ccakLogo.url} alt="CCAK logo" className="ccak-id-logo-mark" />
            <div>
              <p className="ccak-id-org">Coffee Champions Association of Kenya</p>
              <p className="ccak-id-doc-type">Official Digital Membership Card</p>
            </div>
          </div>
          <p className="ccak-id-badge">ACTIVE</p>
        </header>

        <div className="ccak-id-body">
          <div className="ccak-id-photo-wrap">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="ccak-id-photo" />
            ) : (
              <div className="ccak-id-photo placeholder" aria-hidden="true">
                {fullName
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            )}
          </div>
          <div className="ccak-id-fields">
            <Field label="Full name" value={fullName} strong />
            <Field label="Membership code" value={membershipCode} mono />
            <Field label="National ID" value={maskNationalId(nationalId)} mono />
            <Field label="County" value={county} />
            {memberSince && <Field label="Member since" value={memberSince} />}
          </div>
        </div>

        <footer className="ccak-id-footer">
          <p>CCAK membership · {membershipCode}</p>
        </footer>
      </article>

      {/* BACK */}
      <article className="ccak-id-card ccak-id-back" aria-label="CCAK membership card back">
        <img src={ccakLogo.url} alt="" className="ccak-id-watermark subtle" aria-hidden="true" />
        <h3 className="ccak-id-back-title">Our commitment</h3>
        <p className="ccak-id-motto">“{motto}”</p>
        <ul className="ccak-id-objectives">
          {objectives.slice(0, 4).map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>

        <div className="ccak-id-authority">
          <div className="ccak-id-signature-block">
            {presidentSignatureUrl ? (
              <img src={presidentSignatureUrl} alt="" className="ccak-id-signature-img" />
            ) : (
              <p className="ccak-id-signature-placeholder" aria-hidden="true">
                ________________
              </p>
            )}
            <p className="ccak-id-president-name">{presidentName}</p>
            <p className="ccak-id-president-role">National President · Authorising officer</p>
          </div>
          <p className="ccak-id-legal">
            This digital card is issued by the Coffee Champions Association of Kenya. It remains
            the property of CCAK and may be revoked if membership conditions are not met.
          </p>
        </div>
      </article>
    </div>
  );
}

function Field({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="ccak-id-field">
      <span className="ccak-id-label">{label}</span>
      <span className={`ccak-id-value${strong ? " strong" : ""}${mono ? " mono" : ""}`}>{value}</span>
    </div>
  );
}

function maskNationalId(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}
