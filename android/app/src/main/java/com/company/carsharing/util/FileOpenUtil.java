package com.company.carsharing.util;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

import okhttp3.ResponseBody;

public final class FileOpenUtil {
    private FileOpenUtil() {}

    public static File writeResponseBodyToCache(Context ctx, ResponseBody body, String filename) throws Exception {
        File out = new File(ctx.getCacheDir(), filename);
        try (InputStream in = body.byteStream(); FileOutputStream fos = new FileOutputStream(out)) {
            byte[] buf = new byte[8192];
            int r;
            while ((r = in.read(buf)) != -1) {
                fos.write(buf, 0, r);
            }
            fos.flush();
        }
        return out;
    }

    public static void openPdf(Context ctx, File file) {
        openFile(ctx, file, "application/pdf", "Open PDF");
    }

    public static void openFile(Context ctx, File file, String mimeType, String chooserTitle) {
        String mime = (mimeType == null || mimeType.trim().isEmpty()) ? "*/*" : mimeType.trim();
        Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", file);
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(uri, mime);
        i.setFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        ctx.startActivity(Intent.createChooser(i, chooserTitle != null ? chooserTitle : "Open file"));
    }
}

