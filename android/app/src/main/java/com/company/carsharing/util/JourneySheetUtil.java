package com.company.carsharing.util;

import android.content.Context;
import android.widget.Toast;

import com.company.carsharing.R;
import com.company.carsharing.network.ApiService;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.File;

import okhttp3.ResponseBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public final class JourneySheetUtil {
    private JourneySheetUtil() {}

    public static void downloadAndOpen(Context ctx, ApiService api, String reservationId, String status) {
        if (reservationId == null || reservationId.trim().isEmpty()) return;
        if (!"COMPLETED".equalsIgnoreCase(status)) {
            Toast.makeText(ctx, ctx.getString(R.string.reports_journey_not_ready), Toast.LENGTH_SHORT).show();
            return;
        }
        String lang = java.util.Locale.getDefault().getLanguage().toLowerCase().startsWith("ro") ? "ro" : "en";
        String tz = java.util.TimeZone.getDefault().getID();
        api.downloadJourneySheet(reservationId, lang, tz).enqueue(new Callback<ResponseBody>() {
            @Override
            public void onResponse(Call<ResponseBody> call, Response<ResponseBody> response) {
                if (response.isSuccessful() && response.body() != null) {
                    try {
                        File f = FileOpenUtil.writeResponseBodyToCache(ctx, response.body(), "journey-sheet-" + reservationId + ".pdf");
                        FileOpenUtil.openPdf(ctx, f);
                    } catch (Exception e) {
                        Toast.makeText(ctx, ctx.getString(R.string.reports_download_failed), Toast.LENGTH_SHORT).show();
                    }
                    return;
                }
                String msg = parseApiErrorMessage(response);
                Toast.makeText(ctx, msg != null ? msg : ctx.getString(R.string.reports_download_failed), Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onFailure(Call<ResponseBody> call, Throwable t) {
                Toast.makeText(ctx, ctx.getString(R.string.reports_download_failed), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private static String parseApiErrorMessage(Response<?> response) {
        try {
            if (response.errorBody() == null) return null;
            String raw = response.errorBody().string();
            JsonObject o = JsonParser.parseString(raw).getAsJsonObject();
            if (o.has("error") && !o.get("error").isJsonNull()) {
                return o.get("error").getAsString();
            }
        } catch (Exception ignored) {}
        return null;
    }
}

