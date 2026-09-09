package ca.professionalsclub.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * The native sign-in screen. This is the launcher activity: the WebView portal
 * is never shown to a signed-out member, so the first thing the app presents
 * is native UI rather than a web page loading.
 *
 * HOW SIGN-IN WORKS - and why it is not a plain HTTP call. The session cookie
 * is `__Secure-` prefixed, and the auth service checks the request's Origin
 * against its trusted-origins list. A native HTTP client fails both: the
 * CookieManager API refuses to store a __Secure- cookie for the http dev
 * origin, and a bare client sends no Origin header, which production rejects
 * with INVALID_ORIGIN. Instead of fighting that twice, the sign-in POST runs
 * inside a hidden WebView on a stub page carrying our origin - byte for byte
 * the same fetch the web login form makes, so the Origin header, the cookie
 * store and TLS behave identically in dev and production, and the resulting
 * session lands in the one cookie jar the portal WebView reads.
 *
 * Sign-up and password reset stay in the web flow - the signup wizard is a
 * long multi-step form - so those links open the WebView at the right path.
 */
public class LoginActivity extends Activity {

    /** Substring that marks a Neon Auth session cookie. */
    private static final String SESSION_MARKER = "neon-auth.session_token";

    /** Set by MainActivity when the WebView lands on the web login. */
    static final String EXTRA_BOUNCE = "signed_out_bounce";
    static final String EXTRA_AUTH_ERROR = "auth_error";
    /** Tells MainActivity to open a specific path instead of the default. */
    static final String EXTRA_START_PATH = "start_path";

    private String origin;
    private EditText emailField;
    private EditText passwordField;
    private Button signInButton;
    private TextView errorView;
    private WebView authWebView;
    private String pendingFetchJs;

    /**
     * The origin the shell points at, read from the same config the WebView
     * uses, so `npm run app:dev` (localhost) and a store build (production)
     * both sign in against the right server without a second setting.
     */
    static String readOrigin(Context context) {
        try (InputStream in = context.getAssets().open("capacitor.config.json")) {
            byte[] buffer = new byte[in.available()];
            int read = in.read(buffer);
            JSONObject config = new JSONObject(new String(buffer, 0, read, StandardCharsets.UTF_8));
            String url = config.getJSONObject("server").getString("url");
            URL parsed = new URL(url);
            String portPart = parsed.getPort() == -1 ? "" : ":" + parsed.getPort();
            return parsed.getProtocol() + "://" + parsed.getHost() + portPart;
        } catch (Exception e) {
            return "https://professionalsclub.vercel.app";
        }
    }

    private boolean hasSession() {
        String cookies = CookieManager.getInstance().getCookie(origin);
        return cookies != null && cookies.contains(SESSION_MARKER);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        origin = readOrigin(this);

        boolean bounced = getIntent().getBooleanExtra(EXTRA_BOUNCE, false);

        // Already signed in: straight to the portal. The extras are forwarded
        // untouched because a tapped push notification launches THIS activity
        // (it is the launcher), and the Capacitor push plugin finds its payload
        // in MainActivity's intent - dropping the extras here would break
        // notification deep links.
        if (!bounced && hasSession()) {
            launchMain(getIntent().getExtras(), null);
            return;
        }

        // A bounce deliberately does NOT clear cookies any more. It used to,
        // and that made the wipe the only durable cookie write in the app: a
        // bounce is a HEURISTIC ("the WebView is showing /portal/auth"), and it
        // fires for a transient failure too - src/proxy.ts cannot tell "no
        // session" from "could not reach the auth service", so one flaky
        // request at launch erased a perfectly valid seven-day session and made
        // the member type their password again. Nothing needs clearing: a real
        // sign-out or expiry already drops the cookie server-side, and the
        // `bounced` flag (not the wipe) is what stops the check at line 99 from
        // looping back into the WebView. Leaving the cookie alone costs one
        // extra WebView load on the next launch if the session really is dead,
        // and saves the session outright when the bounce was a false alarm.

        setContentView(R.layout.activity_login);
        emailField = findViewById(R.id.login_email);
        passwordField = findViewById(R.id.login_password);
        signInButton = findViewById(R.id.login_submit);
        errorView = findViewById(R.id.login_error);

        // Mirror the web login's error copy for a bounced suspension, so the
        // member is told why they are back here rather than silently looped.
        String authError = getIntent().getStringExtra(EXTRA_AUTH_ERROR);
        if ("account_inactive".equals(authError)) {
            showError("This account is suspended. Contact an administrator for help.");
        }

        signInButton.setOnClickListener(v -> submit());
        passwordField.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                submit();
                return true;
            }
            return false;
        });

        findViewById(R.id.login_forgot).setOnClickListener(v ->
            launchMain(null, "/portal/forgot-password"));
        findViewById(R.id.login_signup).setOnClickListener(v ->
            launchMain(null, "/portal/signup"));
    }

    private void submit() {
        String email = emailField.getText().toString().trim();
        String password = passwordField.getText().toString();
        if (TextUtils.isEmpty(email) || TextUtils.isEmpty(password)) {
            showError("Enter your email and password.");
            return;
        }
        setBusy(true);
        startAuthFetch(email, password);
    }

    /**
     * Run the sign-in fetch inside the hidden WebView. The stub page is loaded
     * with our origin as its base URL (no network round trip), which makes the
     * fetch same-origin: the WebView attaches the right Origin header and
     * processes the response's Set-Cookie into the shared cookie jar - the
     * exact plumbing the web login form uses.
     */
    @SuppressLint("SetJavaScriptEnabled")
    private void startAuthFetch(String email, String password) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("email", email);
            payload.put("password", password);
            // JSONObject.toString() is a valid JS object literal with all
            // quoting handled, so credentials cannot break out of the script.
            pendingFetchJs =
                "(function(){" +
                "var ctl=new AbortController();" +
                "setTimeout(function(){ctl.abort();},15000);" +
                "fetch('/api/auth/sign-in/email',{method:'POST'," +
                "headers:{'content-type':'application/json'},credentials:'include'," +
                "body:JSON.stringify(" + payload + "),signal:ctl.signal})" +
                ".then(function(r){return r.text().then(function(t){PCAuth.onResult(r.status,t);});})" +
                ".catch(function(e){PCAuth.onResult(0,String(e));});" +
                "})();";
        } catch (Exception e) {
            setBusy(false);
            showError("Something went wrong. Please try again.");
            return;
        }

        if (authWebView == null) {
            authWebView = new WebView(this);
            authWebView.getSettings().setJavaScriptEnabled(true);
            authWebView.addJavascriptInterface(new AuthBridge(), "PCAuth");
            authWebView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    if (pendingFetchJs != null) {
                        String js = pendingFetchJs;
                        pendingFetchJs = null;
                        view.evaluateJavascript(js, null);
                    }
                }
            });
        }
        authWebView.loadDataWithBaseURL(origin + "/",
            "<!doctype html><html><body></body></html>", "text/html", "utf-8", null);
    }

    /** Receives the fetch outcome from the hidden WebView's JavaScript. */
    private class AuthBridge {
        @JavascriptInterface
        public void onResult(int status, String body) {
            runOnUiThread(() -> handleAuthResult(status, body));
        }
    }

    private void handleAuthResult(int status, String body) {
        if (status == 200) {
            // The Set-Cookie has only reached the IN-MEMORY jar. Chromium
            // commits it on a ~30 second timer, so a process death inside that
            // window (swiping the app away, Android reclaiming memory, or
            // app-dev.mjs's own force-stop) would lose the session and ask for
            // the password again. Force the write now, before leaving this
            // screen - the same thing Capacitor's own cookie manager does.
            CookieManager.getInstance().flush();
            if (hasSession()) {
                launchMain(null, null);
            } else {
                setBusy(false);
                showError("Signed in, but the session could not be saved. Please try again.");
            }
            return;
        }
        setBusy(false);
        if (status == 0) {
            showError("Can't reach the server. Check your connection and try again.");
            return;
        }
        String message = null;
        try {
            message = new JSONObject(body).optString("message", null);
        } catch (Exception ignored) {
            // Non-JSON error body; fall through to the generic message.
        }
        showError(message != null && !message.isEmpty()
            ? message
            : "Sign-in failed. Please try again.");
    }

    private void launchMain(Bundle forwardedExtras, String startPath) {
        Intent intent = new Intent(this, MainActivity.class);
        if (forwardedExtras != null) intent.putExtras(forwardedExtras);
        if (startPath != null) intent.putExtra(EXTRA_START_PATH, startPath);
        startActivity(intent);
        finish();
    }

    private void setBusy(boolean busy) {
        signInButton.setEnabled(!busy);
        signInButton.setText(busy ? "Signing in…" : "Sign in");
        if (busy) errorView.setVisibility(View.GONE);
    }

    private void showError(String message) {
        errorView.setText(message);
        errorView.setVisibility(View.VISIBLE);
    }

    @Override
    protected void onDestroy() {
        if (authWebView != null) {
            authWebView.destroy();
            authWebView = null;
        }
        super.onDestroy();
    }
}
