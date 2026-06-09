.class public Lcom/zahrantopolyzer/AppWebChromeClient;
.super Landroid/webkit/WebChromeClient;
.source "AppWebChromeClient.java"

.field private activity:Lcom/zahrantopolyzer/MainActivity;

.method public constructor <init>(Lcom/zahrantopolyzer/MainActivity;)V
    .registers 2
    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V
    iput-object p1, p0, Lcom/zahrantopolyzer/AppWebChromeClient;->activity:Lcom/zahrantopolyzer/MainActivity;
    return-void
.end method

# Grant all web-requested permissions (camera, microphone)
.method public onPermissionRequest(Landroid/webkit/PermissionRequest;)V
    .registers 3

    invoke-virtual {p1}, Landroid/webkit/PermissionRequest;->getResources()[Ljava/lang/String;
    move-result-object v0

    invoke-virtual {p1, v0}, Landroid/webkit/PermissionRequest;->grant([Ljava/lang/String;)V
    return-void
.end method

# Handle <input type="file"> — opens the phone image picker
.method public onShowFileChooser(Landroid/webkit/WebView;Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    .registers 8
    .param p1, "webView"
    .param p2, "filePathCallback"
    .param p3, "fileChooserParams"

    # Store callback in MainActivity
    iget-object v0, p0, Lcom/zahrantopolyzer/AppWebChromeClient;->activity:Lcom/zahrantopolyzer/MainActivity;
    iput-object p2, v0, Lcom/zahrantopolyzer/MainActivity;->uploadMessage:Landroid/webkit/ValueCallback;

    # Build image picker Intent
    new-instance v1, Landroid/content/Intent;
    const-string v2, "android.intent.action.GET_CONTENT"
    invoke-direct {v1, v2}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

    const-string v2, "android.intent.category.OPENABLE"
    invoke-virtual {v1, v2}, Landroid/content/Intent;->addCategory(Ljava/lang/String;)Landroid/content/Intent;

    const-string v2, "image/*"
    invoke-virtual {v1, v2}, Landroid/content/Intent;->setType(Ljava/lang/String;)Landroid/content/Intent;

    # Wrap in chooser dialog
    const-string v2, "Select Topography Image"
    invoke-static {v1, v2}, Landroid/content/Intent;->createChooser(Landroid/content/Intent;Ljava/lang/CharSequence;)Landroid/content/Intent;
    move-result-object v3

    # Start the picker Activity
    const/4 v4, 0x1      # FILECHOOSER_RESULTCODE = 1
    invoke-virtual {v0, v3, v4}, Landroid/app/Activity;->startActivityForResult(Landroid/content/Intent;I)V

    # Return true = we handled it
    const/4 v5, 0x1
    return v5
.end method
