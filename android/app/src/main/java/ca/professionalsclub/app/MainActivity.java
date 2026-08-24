package ca.professionalsclub.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * The WebView shell. LoginActivity is the front door; this activity assumes a
 * session exists and shows the portal.
 *
 * Its one piece of native logic is the signed-out bounce: if the WebView ever
 * COMMITS the web login page (/portal/auth committed = the proxy did not
 * redirect = no valid session), the member has logged out, been suspended, or
 * the session expired - so the web login must never be shown. We finish and
 * hand back to the native login instead. Ordinary signed-in visits never
 * trigger this, because the proxy 307s /portal/auth to the dashboard and the
 * WebView only commits the final URL of a redirect chain.
 */
public class MainActivity extends BridgeActivity {

    private boolean bounced = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Bridge bridge = getBridge();
        String origin = LoginActivity.readOrigin(this);

        // "Create an account" / "Forgot password" from the native login open
        // the web flow at that path; everything else starts at the default URL.
        String startPath = getIntent().getStringExtra(LoginActivity.EXTRA_START_PATH);
        if (startPath != null) {
            bridge.getWebView().loadUrl(origin + startPath);
        }

        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                maybeBounce(url, origin);
            }

            // Next.js signs out with a CLIENT-SIDE route change - pushState,
            // no document load - so onPageFinished never fires for it. The
            // WebView reports SPA navigations here, which is what actually
            // catches the logout. Both hooks stay: hard loads land in
            // onPageFinished, soft ones here, and the bounced flag makes the
            // overlap harmless.
            @Override
            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                super.doUpdateVisitedHistory(view, url, isReload);
                maybeBounce(url, origin);
            }
        });
    }

    private void maybeBounce(String url, String origin) {
        if (bounced || url == null || !url.startsWith(origin)) return;
        Uri uri = Uri.parse(url);
        String path = uri.getPath();
        if (path == null || !path.startsWith("/portal/auth")) return;

        // Exception: the signup and reset flows are deliberately web pages a
        // signed-out user reaches from the native login. Only the login page
        // itself bounces.
        bounced = true;
        Intent intent = new Intent(this, LoginActivity.class);
        intent.putExtra(LoginActivity.EXTRA_BOUNCE, true);
        String error = uri.getQueryParameter("error");
        if (error != null) intent.putExtra(LoginActivity.EXTRA_AUTH_ERROR, error);
        startActivity(intent);
        finish();
    }
}
