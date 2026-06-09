.class public Lcom/zahrantopolyzer/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"

# File chooser result code
.field public static final FILECHOOSER_RESULTCODE:I = 0x1

# Holds the pending file chooser callback from the web page
.field public uploadMessage:Landroid/webkit/ValueCallback;

.field private webView:Landroid/webkit/WebView;

.method public constructor <init>()V
    .registers 1
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V
    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .registers 14
    .param p1, "savedInstanceState"

    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    # Create WebView
    new-instance v0, Landroid/webkit/WebView;
    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V
    iput-object v0, p0, Lcom/zahrantopolyzer/MainActivity;->webView:Landroid/webkit/WebView;

    # Full-screen content view
    invoke-virtual {p0, v0}, Landroid/app/Activity;->setContentView(Landroid/view/View;)V

    # ------- WebSettings -------
    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;
    move-result-object v1

    const/4 v2, 0x1

    # JavaScript
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V

    # DOM storage
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V

    # File access
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowUniversalAccessFromFileURLs(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowFileAccessFromFileURLs(Z)V

    # MIXED_CONTENT_ALWAYS_ALLOW = 0
    const/4 v2, 0x0
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setMixedContentMode(I)V

    const/4 v2, 0x1

    # Viewport
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setUseWideViewPort(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setLoadWithOverviewMode(Z)V

    # Disable zoom
    const/4 v2, 0x0
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setSupportZoom(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setBuiltInZoomControls(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDisplayZoomControls(Z)V

    # Media
    const/4 v2, 0x0
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setMediaPlaybackRequiresUserGesture(Z)V

    # Cache
    const/16 v2, -0x1
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setCacheMode(I)V

    # ------- WebViewClient -------
    new-instance v3, Lcom/zahrantopolyzer/AppWebViewClient;
    invoke-direct {v3, p0}, Lcom/zahrantopolyzer/AppWebViewClient;-><init>(Landroid/content/Context;)V
    invoke-virtual {v0, v3}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V

    # ------- WebChromeClient -------
    new-instance v4, Lcom/zahrantopolyzer/AppWebChromeClient;
    invoke-direct {v4, p0}, Lcom/zahrantopolyzer/AppWebChromeClient;-><init>(Lcom/zahrantopolyzer/MainActivity;)V
    invoke-virtual {v0, v4}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V

    # ------- Read www/index.html from assets into a String -------
    # Using loadDataWithBaseURL("http://localhost/", html, "text/html", "UTF-8", null)
    # gives the page http://localhost/ origin so Web Workers become
    # blob:http://localhost/ and can freely fetch http://localhost/tesseract/*
    # via shouldInterceptRequest — no cleartext network connection is made.

    invoke-virtual {p0}, Landroid/content/Context;->getAssets()Landroid/content/res/AssetManager;
    move-result-object v5

    :try_start_read
    const-string v6, "www/index.html"
    invoke-virtual {v5, v6}, Landroid/content/res/AssetManager;->open(Ljava/lang/String;)Ljava/io/InputStream;
    move-result-object v6

    new-instance v7, Ljava/io/InputStreamReader;
    invoke-direct {v7, v6}, Ljava/io/InputStreamReader;-><init>(Ljava/io/InputStream;)V

    new-instance v8, Ljava/io/BufferedReader;
    invoke-direct {v8, v7}, Ljava/io/BufferedReader;-><init>(Ljava/io/Reader;)V

    new-instance v9, Ljava/lang/StringBuilder;
    invoke-direct {v9}, Ljava/lang/StringBuilder;-><init>()V

    const-string v11, "\n"

    :read_loop
    invoke-virtual {v8}, Ljava/io/BufferedReader;->readLine()Ljava/lang/String;
    move-result-object v10
    if-eqz v10, :read_done
    invoke-virtual {v9, v10}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v9, v11}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    goto :read_loop

    :read_done
    invoke-virtual {v8}, Ljava/io/BufferedReader;->close()V
    :try_end_read
    .catch Ljava/io/IOException; {:try_start_read .. :try_end_read} :read_error

    # Build args for loadDataWithBaseURL in v0..v5 (contiguous for invoke-virtual/range)
    # v0 = WebView (object)
    # v1 = baseUrl
    # v2 = html data
    # v3 = mimeType
    # v4 = encoding
    # v5 = historyUrl (null)
    const-string v1, "http://localhost/"
    invoke-virtual {v9}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v2
    const-string v3, "text/html"
    const-string v4, "UTF-8"
    const/4 v5, 0x0

    invoke-virtual/range {v0 .. v5}, Landroid/webkit/WebView;->loadDataWithBaseURL(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V

    return-void

    :read_error
    move-exception v1
    # Fallback: load from file:// URL
    const-string v1, "file:///android_asset/www/index.html"
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    return-void

.end method

# Receives result from the image picker Activity
.method protected onActivityResult(IILandroid/content/Intent;)V
    .registers 8
    .param p1, "requestCode"
    .param p2, "resultCode"
    .param p3, "data"

    # if (requestCode != FILECHOOSER_RESULTCODE) → super and return
    const/4 v0, 0x1
    if-eq p1, v0, :is_file_chooser

    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onActivityResult(IILandroid/content/Intent;)V
    return-void

    :is_file_chooser

    # Grab and clear the pending callback
    iget-object v1, p0, Lcom/zahrantopolyzer/MainActivity;->uploadMessage:Landroid/webkit/ValueCallback;
    if-nez v1, :have_callback
    return-void

    :have_callback
    const/4 v2, 0x0
    iput-object v2, p0, Lcom/zahrantopolyzer/MainActivity;->uploadMessage:Landroid/webkit/ValueCallback;

    # Build results array
    # Default: null (user cancelled)
    const/4 v3, 0x0    # results = null

    # if (resultCode != RESULT_OK) → send null
    const/4 v4, -0x1    # RESULT_OK = -1
    if-ne p2, v4, :send_result

    # if (data == null) → send null
    if-eqz p3, :send_result

    # Get selected URI
    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;
    move-result-object v5

    if-eqz v5, :send_result

    # Build Uri[] {uri}
    const/4 v6, 0x1
    new-array v3, v6, [Landroid/net/Uri;
    const/4 v6, 0x0
    aput-object v5, v3, v6

    :send_result
    invoke-interface {v1, v3}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    return-void
.end method

# Back button: navigate web history first, then exit
.method public onBackPressed()V
    .registers 3

    iget-object v0, p0, Lcom/zahrantopolyzer/MainActivity;->webView:Landroid/webkit/WebView;

    invoke-virtual {v0}, Landroid/webkit/WebView;->canGoBack()Z
    move-result v1

    if-eqz v1, :no_history

    invoke-virtual {v0}, Landroid/webkit/WebView;->goBack()V
    return-void

    :no_history
    invoke-super {p0}, Landroid/app/Activity;->onBackPressed()V
    return-void
.end method
