/**
 * Assertion suite for the deterministic half of the pipeline.
 *
 * GET /api/selftest
 *
 * Everything downstream of the model is pure and testable, and this exercises
 * it: evidence verification (including a deliberately fabricated quote), the
 * scoring maths, semantic validation, URL normalisation, fingerprinting and the
 * SSRF guard. No model call and no network, so it runs instantly and for free.
 *
 * A route rather than a test runner because the POC ships no test framework;
 * this keeps the logic verifiable without adding one, and runs against the real
 * module graph including path aliases. It is development-only — a deployed app
 * has no business exposing its test suite.
 */
import { verifyEvidence, findUnsupportedFields, scoreEvidenceCoverage } from "@/server/quality/evidence";
import { scoreCompleteness, findMissingFields } from "@/server/quality/completeness";
import { buildIssues } from "@/server/quality/issues";
import { scoreConfidence, scoreSourceQuality } from "@/server/quality/confidence";
import { normalizeUrl } from "@/server/dedupe/normalizeUrl";
import { buildFingerprint } from "@/server/dedupe/fingerprint";
import { assertSafeUrl } from "@/server/urlGuard";

export const dynamic = "force-dynamic";

const SOURCE = `# Morning Breathwork
Hosted by The Breathing Space in Berlin.
Tickets are €45 per person. Join us on 2026-09-12 at 6 PM.
The studio is at Torstrasse 12, Berlin, Germany.`;

export async function GET() {
	if (process.env.NODE_ENV === "production") {
		return new Response("Not found", { status: 404 });
	}

	const out = [];
	const t = (name, actual, expected) => {
		const pass = JSON.stringify(actual) === JSON.stringify(expected);
		out.push(`${pass ? "PASS" : "FAIL"} ${name}${pass ? "" : ` -> got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`}`);
	};

	const extraction = {
		title: "Morning Breathwork",
		description: "A breathwork session.",
		category: "Breathwork",
		tags: [],
		provider: { name: "The Breathing Space", website: null },
		location: { name: null, address: "Torstrasse 12", city: "Berlin", country: "Germany" },
		schedule: { start: "2026-09-12T18:00:00Z", end: null, timezone: null },
		pricing: { amount: 45, currency: "EUR" },
		relevance: { isRelevant: true, score: 92, reason: "Breathwork practice." },
		conflicts: [],
	};

	// --- evidence verification ---
	const evidence = verifyEvidence(
		[
			{ field: "pricing.amount", value: "45", snippet: "Tickets are €45 per person." },
			{ field: "location.city", value: "Berlin", snippet: "The studio is at Torstrasse 12, Berlin" },
			{ field: "schedule.start", value: "2026-09-12", snippet: "Join us on 2099-01-01" }, // fabricated
			{ field: "provider.name", value: "The Breathing Space", snippet: "**Hosted by The Breathing Space**" }, // markdown differs
		],
		SOURCE
	);
	t("verified: exact quote", evidence[0].verified, true);
	t("verified: partial quote", evidence[1].verified, true);
	t("rejected: fabricated quote", evidence[2].verified, false);
	t("verified: markdown-normalised", evidence[3].verified, true);

	// Two distinct failure modes, both caught: schedule.start has a fabricated
	// quote, location.address has a value with no evidence entry offered at all.
	const unsupported = findUnsupportedFields(extraction, evidence);
	t("unsupported = fabricated + unevidenced", unsupported, ["schedule.start", "location.address"]);

	// 3 of the 5 required fields carry a verified quote.
	t("evidence coverage", scoreEvidenceCoverage(extraction, evidence), 60);

	// --- completeness ---
	t("completeness (all weighted fields present)", scoreCompleteness(extraction), 100);
	t("missing fields", findMissingFields(extraction), ["end time"]);

	// --- issues ---
	const { issues, validationScore } = buildIssues({
		extraction,
		unsupportedFields: unsupported,
		conflicts: [],
		duplicate: null,
	});
	t(
		"issue names the unverified field",
		issues.some((i) => i.includes("Start date could not be verified")),
		true
	);
	out.push(`INFO issues=${JSON.stringify(issues)} validation=${validationScore}`);

	// --- negative price / bad currency ---
	const bad = buildIssues({
		extraction: {
			...extraction,
			pricing: { amount: -5, currency: "euros" },
			schedule: { start: "2020-01-01T00:00:00Z", end: "2019-01-01T00:00:00Z", timezone: null },
		},
		unsupportedFields: [],
		conflicts: ["Two different dates were found."],
		duplicate: null,
	});
	t("catches negative price", bad.issues.some((i) => i.includes("negative")), true);
	t("catches bad currency", bad.issues.some((i) => i.includes("three-letter")), true);
	t("catches end before start", bad.issues.some((i) => i.includes("end time is before")), true);
	t("catches past date", bad.issues.some((i) => i.includes("already taken place")), true);
	t("surfaces conflicts", bad.issues.some((i) => i.includes("Conflicting information")), true);

	// --- confidence ---
	const good = scoreConfidence({ completeness: 100, evidenceCoverage: 80, validation: 90, sourceQuality: 85 });
	t("confidence math", good.confidence, Math.round(100 * 0.3 + 80 * 0.3 + 90 * 0.2 + 85 * 0.2));
	t("fixture source quality is capped low", scoreSourceQuality({ provider: "fixture", markdown: "x".repeat(9000), title: "T", url: "https://a.com" }), 25);
	out.push(`INFO tinyfish sourceQuality=${scoreSourceQuality({ provider: "tinyfish", markdown: "x".repeat(9000), title: "Real Title", url: "https://a.com" })}`);

	// --- url normalisation / dedupe ---
	t(
		"strips tracking params",
		normalizeUrl("https://WWW.Example.com/event/?utm_source=x&fbclid=y&id=7#top"),
		"https://example.com/event?id=7"
	);
	t(
		"trailing slash + param order",
		normalizeUrl("https://example.com/a/b/?b=2&a=1"),
		normalizeUrl("https://example.com/a/b?a=1&b=2")
	);
	t(
		"fingerprint ignores accents/case",
		buildFingerprint({ ...extraction, location: { ...extraction.location, city: "BERLÍN" } }) ===
			buildFingerprint({ ...extraction, location: { ...extraction.location, city: "berlin" } }),
		true
	);
	t(
		"fingerprint differs on different date",
		buildFingerprint(extraction) ===
			buildFingerprint({ ...extraction, schedule: { ...extraction.schedule, start: "2027-01-01" } }),
		false
	);

	// --- SSRF guard ---
	for (const [url, shouldPass] of [
		["https://example.com", true],
		["http://localhost:3000", false],
		["http://127.0.0.1/x", false],
		["http://169.254.169.254/latest/meta-data/", false],
		["http://10.0.0.5", false],
		["file:///etc/passwd", false],
		["https://user:pw@example.com", false],
		["not a url at all", false],
	]) {
		let passed = false;
		try {
			await assertSafeUrl(url);
			passed = true;
		} catch {
			passed = false;
		}
		t(`urlGuard ${url}`, passed, shouldPass);
	}

	const failures = out.filter((l) => l.startsWith("FAIL")).length;
	return new Response(`${out.join("\n")}\n\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}\n`, {
		headers: { "content-type": "text/plain" },
	});
}
