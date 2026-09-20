package com.syntaxisreaper.budgetplanner;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;
import java.text.NumberFormat;
import java.util.Locale;

public class BudgetWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // There may be multiple widgets active, so update all of them
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager,
                                int appWidgetId) {

        // Construct the RemoteViews object
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.budget_widget);

        // Get total_balance from Capacitor Preferences
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String balanceStr = prefs.getString("total_balance", "0");
        
        try {
            double balance = Double.parseDouble(balanceStr);
            NumberFormat format = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
            views.setTextViewText(R.id.widget_balance, format.format(balance));
        } catch (NumberFormatException e) {
            views.setTextViewText(R.id.widget_balance, "₹0");
        }

        // Setup the Quick Add intent
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("budgetapp://add-transaction"));
        intent.setPackage(context.getPackageName()); // Ensure it targets this app specifically
        
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        
        views.setOnClickPendingIntent(R.id.widget_add_button, pendingIntent);
        
        // Also make tapping the balance open the app normally
        Intent openAppIntent = new Intent(context, MainActivity.class);
        PendingIntent openAppPending = PendingIntent.getActivity(context, 1, openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_balance, openAppPending);

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
