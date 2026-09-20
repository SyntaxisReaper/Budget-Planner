package com.syntaxisreaper.budgetplanner;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Currency;
import java.util.List;

public class AccountsWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new AccountsRemoteViewsFactory(this.getApplicationContext());
    }
}

class AccountsRemoteViewsFactory implements RemoteViewsService.RemoteViewsFactory {

    private Context context;
    private List<AccountItem> accountsList = new ArrayList<>();

    public AccountsRemoteViewsFactory(Context context) {
        this.context = context;
    }

    @Override
    public void onCreate() {
        loadData();
    }

    @Override
    public void onDataSetChanged() {
        loadData();
    }

    private void loadData() {
        accountsList.clear();
        try {
            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String accountsJson = prefs.getString("accounts_data", "[]");
            
            JSONArray jsonArray = new JSONArray(accountsJson);
            for (int i = 0; i < jsonArray.length(); i++) {
                JSONObject obj = jsonArray.getJSONObject(i);
                accountsList.add(new AccountItem(
                        obj.getString("name"),
                        obj.getDouble("balance")
                ));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onDestroy() {
        accountsList.clear();
    }

    @Override
    public int getCount() {
        return accountsList.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        if (position >= getCount()) return null;

        AccountItem item = accountsList.get(position);
        RemoteViews rv = new RemoteViews(context.getPackageName(), R.layout.accounts_widget_item);

        rv.setTextViewText(R.id.widget_account_name, item.name);
        
        NumberFormat format = NumberFormat.getCurrencyInstance();
        format.setCurrency(Currency.getInstance("INR"));
        rv.setTextViewText(R.id.widget_account_balance, format.format(item.balance));

        // Let the click intent trigger the pending intent template in the provider
        Intent fillInIntent = new Intent();
        rv.setOnClickFillInIntent(R.id.widget_account_name, fillInIntent);

        return rv;
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return true;
    }
    
    private static class AccountItem {
        String name;
        double balance;
        AccountItem(String name, double balance) {
            this.name = name;
            this.balance = balance;
        }
    }
}
