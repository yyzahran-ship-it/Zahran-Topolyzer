package com.zahrantopolyzer;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Rect;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * JavascriptInterface bridge: the React app calls
 *   window.Android.recognizeImage(base64DataUrl, callbackName)
 * and this class decodes the image, runs ML Kit Text Recognition,
 * then fires window[callbackName](resultJson) back on the UI thread.
 *
 * Result JSON shape:
 *   { imgW: number, imgH: number,
 *     words: [{ text, confidence, x0, y0, x1, y1 }, ...] }
 */
public class OcrBridge {

    private final Context context;
    private final WebView  webView;

    public OcrBridge(Context context, WebView webView) {
        this.context = context;
        this.webView  = webView;
    }

    @JavascriptInterface
    public void recognizeImage(final String base64Data, final String callbackName) {
        try {
            // Strip the "data:image/...;base64," prefix if present
            String raw = base64Data.contains(",")
                    ? base64Data.substring(base64Data.indexOf(',') + 1)
                    : base64Data;

            byte[]  bytes  = Base64.decode(raw, Base64.DEFAULT);
            Bitmap  bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);

            if (bitmap == null) {
                fireCallback(callbackName, null);
                return;
            }

            final int imgW = bitmap.getWidth();
            final int imgH = bitmap.getHeight();

            InputImage    image      = InputImage.fromBitmap(bitmap, 0);
            TextRecognizer recognizer = TextRecognition.getClient(
                    TextRecognizerOptions.DEFAULT_OPTIONS);

            recognizer.process(image)
                .addOnSuccessListener(visionText -> {
                    try {
                        JSONArray wordsArr = new JSONArray();

                        for (Text.TextBlock block : visionText.getTextBlocks()) {
                            for (Text.Line line : block.getLines()) {
                                for (Text.Element element : line.getElements()) {
                                    Rect bbox = element.getBoundingBox();
                                    if (bbox == null) continue;

                                    // ML Kit confidence is 0–1; multiply by 100 to match
                                    // Tesseract's 0–100 scale used elsewhere in the app.
                                    float conf = element.getConfidence() != null
                                            ? element.getConfidence() * 100f : 90f;

                                    JSONObject w = new JSONObject();
                                    w.put("text",       element.getText());
                                    w.put("confidence", conf);
                                    w.put("x0", bbox.left);
                                    w.put("y0", bbox.top);
                                    w.put("x1", bbox.right);
                                    w.put("y1", bbox.bottom);
                                    wordsArr.put(w);
                                }
                            }
                        }

                        JSONObject result = new JSONObject();
                        result.put("imgW",  imgW);
                        result.put("imgH",  imgH);
                        result.put("words", wordsArr);

                        fireCallback(callbackName, result.toString());

                    } catch (Exception e) {
                        fireCallback(callbackName, null);
                    }
                })
                .addOnFailureListener(e -> fireCallback(callbackName, null));

        } catch (Exception e) {
            fireCallback(callbackName, null);
        }
    }

    private void fireCallback(final String callbackName, final String jsonOrNull) {
        final String js = jsonOrNull != null
                ? "window['" + callbackName + "'](" + jsonOrNull + ")"
                : "window['" + callbackName + "'](null)";
        // evaluateJavascript must run on the UI thread
        webView.post(() -> webView.evaluateJavascript(js, null));
    }
}
