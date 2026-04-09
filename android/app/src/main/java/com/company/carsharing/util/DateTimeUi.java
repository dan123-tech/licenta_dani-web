package com.company.carsharing.util;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public final class DateTimeUi {
    private DateTimeUi() {}

    private static final DateTimeFormatter UI =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public static String format(String raw) {
        if (raw == null) return "";
        String s = raw.trim();
        if (s.isEmpty()) return "";

        // If it's already a short-ish local string, keep it.
        if (s.length() <= 16 && s.matches("\\d{4}-\\d{2}-\\d{2}.*")) return s;

        try {
            // e.g. 2026-04-09T10:11:12.123Z
            Instant i = Instant.parse(s);
            return UI.format(LocalDateTime.ofInstant(i, ZoneId.systemDefault()));
        } catch (Exception ignored) {}

        try {
            // e.g. 2026-04-09T10:11:12+02:00
            OffsetDateTime odt = OffsetDateTime.parse(s);
            return UI.format(odt.atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime());
        } catch (Exception ignored) {}

        try {
            // e.g. 2026-04-09T10:11:12 (no zone)
            LocalDateTime ldt = LocalDateTime.parse(s);
            return UI.format(ldt);
        } catch (Exception ignored) {}

        // Last resort: trim very long strings.
        return s.length() > 40 ? s.substring(0, 40) + "…" : s;
    }
}

