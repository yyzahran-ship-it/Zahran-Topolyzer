.class public Lcom/zahrantopolyzer/AppWebViewClient;
.super Landroid/webkit/WebViewClient;
.source "AppWebViewClient.java"

.field private context:Landroid/content/Context;

# Constructor takes Context so we can access assets
.method public constructor <init>(Landroid/content/Context;)V
    .registers 2
    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V
    iput-object p1, p0, Lcom/zahrantopolyzer/AppWebViewClient;->context:Landroid/content/Context;
    return-void
.end method

# Keep all navigation inside the WebView
.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Ljava/lang/String;)Z
    .registers 3
    const/4 v0, 0x0
    return v0
.end method

# Virtual asset server: intercept http://localhost/* and serve from assets/www/
# This allows Web Workers (blocked on file:// URLs) and proper CORS handling.
.method public shouldInterceptRequest(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;)Landroid/webkit/WebResourceResponse;
    .registers 14

    invoke-interface {p2}, Landroid/webkit/WebResourceRequest;->getUrl()Landroid/net/Uri;
    move-result-object v0

    invoke-virtual {v0}, Landroid/net/Uri;->toString()Ljava/lang/String;
    move-result-object v1

    const-string v2, "http://localhost/"
    invoke-virtual {v1, v2}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v3
    if-eqz v3, :not_local

    # Extract path component (skip "http://localhost/" = 17 chars)
    const/16 v3, 17
    invoke-virtual {v1, v3}, Ljava/lang/String;->substring(I)Ljava/lang/String;
    move-result-object v4

    # Strip query string if present
    const-string v5, "?"
    invoke-virtual {v4, v5}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z
    move-result v6
    if-eqz v6, :no_query_string
    invoke-virtual {v4, v5}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I
    move-result v7
    const/4 v8, 0x0
    invoke-virtual {v4, v8, v7}, Ljava/lang/String;->substring(II)Ljava/lang/String;
    move-result-object v4
    :no_query_string

    # Map path to asset:  "" -> "www/index.html",  "foo/bar" -> "www/foo/bar"
    invoke-virtual {v4}, Ljava/lang/String;->isEmpty()Z
    move-result v5
    if-eqz v5, :build_path
    const-string v4, "www/index.html"
    goto :open_asset

    :build_path
    new-instance v5, Ljava/lang/StringBuilder;
    invoke-direct {v5}, Ljava/lang/StringBuilder;-><init>()V
    const-string v6, "www/"
    invoke-virtual {v5, v6}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v5, v4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v5}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v4

    :open_asset
    iget-object v5, p0, Lcom/zahrantopolyzer/AppWebViewClient;->context:Landroid/content/Context;
    invoke-virtual {v5}, Landroid/content/Context;->getAssets()Landroid/content/res/AssetManager;
    move-result-object v6

    :try_start
    invoke-virtual {v6, v4}, Landroid/content/res/AssetManager;->open(Ljava/lang/String;)Ljava/io/InputStream;
    move-result-object v7
    :try_end
    .catch Ljava/io/IOException; {:try_start .. :try_end} :io_error

    invoke-static {v4}, Lcom/zahrantopolyzer/AppWebViewClient;->getMimeType(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v8

    new-instance v9, Landroid/webkit/WebResourceResponse;
    const-string v10, "UTF-8"
    invoke-direct {v9, v8, v10, v7}, Landroid/webkit/WebResourceResponse;-><init>(Ljava/lang/String;Ljava/lang/String;Ljava/io/InputStream;)V
    return-object v9

    :io_error
    move-exception v0
    :not_local
    const/4 v0, 0x0
    return-object v0
.end method

.method private static getMimeType(Ljava/lang/String;)Ljava/lang/String;
    .registers 3
    const-string v1, ".html"
    invoke-virtual {p0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :j1
    const-string v0, "text/html"
    return-object v0
    :j1
    const-string v1, ".js"
    invoke-virtual {p0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :j2
    const-string v0, "application/javascript"
    return-object v0
    :j2
    const-string v1, ".css"
    invoke-virtual {p0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :j3
    const-string v0, "text/css"
    return-object v0
    :j3
    const-string v1, ".png"
    invoke-virtual {p0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :j4
    const-string v0, "image/png"
    return-object v0
    :j4
    const-string v0, "application/octet-stream"
    return-object v0
.end method
