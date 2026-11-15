package com.spotifydashboard.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.sqlite.SQLiteDatabase;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.ContextCompat;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Keeps a copy of the app's private data in a public folder so a reinstall
 * does not wipe the sign-ins, settings and library.
 *
 * Android deletes everything under /data/data/<pkg> when the app is
 * uninstalled, which is why a fresh install always asked for the Spotify and
 * media-server logins again. This vault mirrors:
 *
 *   shared_prefs - Capacitor Preferences: Spotify tokens, server URL + JWT,
 *                  grid size, view modes, backup settings, link history.
 *   databases    - the @capacitor-community/sqlite library (albums_dbSQLite.db).
 *   files        - anything the Filesystem plugin wrote (CSV exports).
 *
 * into two places:
 *
 *   Documents/reSpotIt              - visible in the Files app, survives
 *                                     uninstall, but needs "All files access"
 *                                     on Android 11+ (which Android revokes
 *                                     on uninstall).
 *   Android/media/<pkg>/reSpotIt    - no permission needed and also survives
 *                                     uninstall, so this is the copy that
 *                                     makes a reinstall restore automatically.
 *
 * On a fresh install restoreIfEmpty() copies the vault back before the
 * WebView loads, so the app comes up already signed in.
 */
public final class DataVault {

    private static final String TAG = "DataVault";

    /** Public folder name under Documents (and under Android/media/<pkg>). */
    public static final String FOLDER_NAME = "reSpotIt";

    /** Written last, so a half-finished copy is never treated as a valid vault. */
    private static final String MARKER = "vault-info.txt";

    private static final String TMP_SUFFIX = ".vault-tmp";

    /** Private directories mirrored in both directions. */
    private static final String[] MIRRORED_DIRS = { "shared_prefs", "databases", "files" };

    /** File name the SQLite plugin uses for the library database. */
    private static final String LIBRARY_DB = "albums_dbSQLite.db";

    private DataVault() { }

    // -- Location ------------------------------------------------------------

    private static File documentsRoot() {
        return new File(
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS),
            FOLDER_NAME
        );
    }

    private static File mediaRoot(Context context) {
        File[] dirs = context.getExternalMediaDirs();
        if (dirs == null || dirs.length == 0 || dirs[0] == null) return null;
        return new File(dirs[0], FOLDER_NAME);
    }

    /** True when the app may write to the real public Documents folder. */
    public static boolean hasDocumentsAccess(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return Environment.isExternalStorageManager();
        }
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.WRITE_EXTERNAL_STORAGE
        ) == PackageManager.PERMISSION_GRANTED;
    }

    /** Every place the vault can live, best first. */
    private static List<File> vaultRoots(Context context) {
        List<File> roots = new ArrayList<>();
        if (hasDocumentsAccess(context)) roots.add(documentsRoot());
        File media = mediaRoot(context);
        if (media != null) roots.add(media);
        return roots;
    }

    /** Human-readable folder, e.g. "Documents/reSpotIt". */
    public static String displayPath(Context context) {
        if (hasDocumentsAccess(context)) return "Documents/" + FOLDER_NAME;
        return fallbackPath(context);
    }

    /** Secondary copy the app always keeps, shown under the main folder. */
    public static String fallbackPath(Context context) {
        return "Android/media/" + context.getPackageName() + "/" + FOLDER_NAME;
    }

    /**
     * Settings intent that grants "All files access" (Android 11+). Returns
     * null on older versions, where a normal WRITE_EXTERNAL_STORAGE runtime
     * permission is enough.
     */
    public static Intent accessIntent(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return null;
        Intent perApp = new Intent(
            Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
            Uri.parse("package:" + context.getPackageName())
        );
        if (perApp.resolveActivity(context.getPackageManager()) != null) return perApp;
        return new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
    }

    // -- Status --------------------------------------------------------------

    public static long lastSaved(Context context) {
        long newest = 0L;
        for (File root : vaultRoots(context)) {
            File marker = new File(root, MARKER);
            if (marker.isFile()) newest = Math.max(newest, marker.lastModified());
        }
        return newest;
    }

    public static int fileCount(Context context) {
        int count = 0;
        for (File root : vaultRoots(context)) {
            for (String name : MIRRORED_DIRS) {
                File[] files = new File(root, name).listFiles();
                if (files == null) continue;
                for (File f : files) {
                    if (f.isFile() && !f.getName().endsWith(TMP_SUFFIX)) count++;
                }
            }
        }
        return count;
    }

    public static boolean needsPermission(Context context) {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !hasDocumentsAccess(context);
    }

    // -- Restore -------------------------------------------------------------

    /**
     * Copies the vault back into the app's private storage, but only when the
     * app has no data of its own yet (i.e. right after a fresh install).
     * Must run before the WebView loads and before Preferences are read.
     */
    public static boolean restoreIfEmpty(Context context) {
        try {
            if (hasLocalData(context)) {
                Log.i(TAG, "local data present, not restoring");
                return false;
            }
            File source = null;
            long newest = 0L;
            for (File root : vaultRoots(context)) {
                File marker = new File(root, MARKER);
                if (!marker.isFile()) continue;
                if (marker.lastModified() > newest) {
                    newest = marker.lastModified();
                    source = root;
                }
            }
            if (source == null) {
                Log.i(TAG, "no vault found");
                return false;
            }
            int restored = 0;
            for (String name : MIRRORED_DIRS) {
                File src = new File(source, name);
                if (!src.isDirectory()) continue;
                File dst = new File(context.getApplicationInfo().dataDir, name);
                if (!dst.isDirectory() && !dst.mkdirs()) continue;
                restored += copyDirContents(src, dst, true);
            }
            Log.i(TAG, "restored " + restored + " file(s) from " + source.getAbsolutePath());
            return restored > 0;
        } catch (Exception e) {
            Log.w(TAG, "restore failed", e);
            return false;
        }
    }

    /** True when the app already has its own prefs or library. */
    private static boolean hasLocalData(Context context) {
        File prefsDir = new File(context.getApplicationInfo().dataDir, "shared_prefs");
        File[] prefs = prefsDir.listFiles();
        boolean hasPrefs = false;
        if (prefs != null) {
            for (File f : prefs) {
                // Capacitor Preferences writes everything into one file.
                if (f.isFile() && (f.getName().endsWith(".xml") || f.getName().equals("CapacitorStorage"))) {
                    hasPrefs = true;
                    break;
                }
            }
        }
        File db = new File(context.getApplicationInfo().dataDir, "databases/" + LIBRARY_DB);
        return hasPrefs || db.isFile();
    }

    // -- Backup --------------------------------------------------------------

    /**
     * Mirrors prefs + library into the vault. Blocking I/O: call from a
     * background thread.
     */
    public static synchronized boolean backup(Context context) {
        try {
            // Fold the WAL back into the .db so the copy is self-contained.
            checkpointLibrary(context);
            boolean savedAny = false;
            for (File root : vaultRoots(context)) {
                if (!root.isDirectory() && !root.mkdirs()) {
                    Log.w(TAG, "cannot create " + root.getAbsolutePath());
                    continue;
                }
                int copied = 0;
                for (String name : MIRRORED_DIRS) {
                    File src = new File(context.getApplicationInfo().dataDir, name);
                    if (!src.isDirectory()) continue;
                    File dst = new File(root, name);
                    if (!dst.isDirectory() && !dst.mkdirs()) continue;
                    copied += copyDirContents(src, dst, false);
                }
                File marker = new File(root, MARKER);
                StringBuilder sb = new StringBuilder();
                sb.append("reSpotIt data vault\n");
                sb.append("package=").append(context.getPackageName()).append('\n');
                sb.append("saved=").append(System.currentTimeMillis()).append('\n');
                sb.append("files=").append(copied).append('\n');
                writeFile(marker, sb.toString());
                Log.i(TAG, "saved " + copied + " file(s) to " + root.getAbsolutePath());
                savedAny = true;
            }
            return savedAny;
        } catch (Exception e) {
            Log.w(TAG, "backup failed", e);
            return false;
        }
    }

    /**
     * Runs "PRAGMA wal_checkpoint(TRUNCATE)" so the .db contains the latest
     * rows without needing the -wal sidecar. Best effort: a busy checkpoint
     * just leaves the WAL in place, which is copied too.
     */
    private static void checkpointLibrary(Context context) {
        File dbFile = new File(context.getApplicationInfo().dataDir, "databases/" + LIBRARY_DB);
        if (!dbFile.isFile()) return;
        SQLiteDatabase db = null;
        try {
            db = SQLiteDatabase.openDatabase(
                dbFile.getAbsolutePath(),
                null,
                SQLiteDatabase.OPEN_READWRITE
            );
            db.rawQuery("PRAGMA wal_checkpoint(TRUNCATE)", null).close();
        } catch (Exception e) {
            Log.w(TAG, "wal checkpoint skipped", e);
        } finally {
            if (db != null) {
                try { db.close(); } catch (Exception ignored) { }
            }
        }
    }

    // -- Copying -------------------------------------------------------------

    private static int copyDirContents(File src, File dst, boolean onlyIfMissing) {
        int copied = 0;
        File[] files = src.listFiles();
        if (files == null) return 0;
        for (File file : files) {
            if (!file.isFile()) continue;
            if (file.getName().endsWith(TMP_SUFFIX)) continue;
            File target = new File(dst, file.getName());
            if (onlyIfMissing && target.exists()) continue;
            File tmp = new File(dst, file.getName() + TMP_SUFFIX);
            try {
                copyFile(file, tmp);
                if (target.exists() && !target.delete()) {
                    tmp.delete();
                    continue;
                }
                if (!tmp.renameTo(target)) {
                    copyFile(tmp, target);
                    tmp.delete();
                }
                copied++;
            } catch (Exception e) {
                Log.w(TAG, "could not copy " + file.getName(), e);
                tmp.delete();
            }
        }
        return copied;
    }

    private static void copyFile(File from, File to) throws IOException {
        InputStream in = new FileInputStream(from);
        try {
            OutputStream out = new FileOutputStream(to);
            try {
                byte[] buffer = new byte[64 * 1024];
                int read;
                while ((read = in.read(buffer)) > 0) out.write(buffer, 0, read);
                out.flush();
            } finally {
                out.close();
            }
        } finally {
            in.close();
        }
    }

    private static void writeFile(File file, String content) throws IOException {
        FileOutputStream out = new FileOutputStream(file);
        try {
            out.write(content.getBytes("UTF-8"));
            out.flush();
        } finally {
            out.close();
        }
    }

    /** Mirrored directory names, for diagnostics. */
    public static List<String> mirroredDirs() {
        return Arrays.asList(MIRRORED_DIRS);
    }
}
