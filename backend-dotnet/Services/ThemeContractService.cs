using System.Text.Json;

namespace backend_dotnet.Services;

public interface IThemeContractService
{
    bool Validate(string templatesJson, string sectionSchemasJson, string hookPointsJson, out string error);
}

public class ThemeContractService : IThemeContractService
{
    private static readonly string[] MandatoryTemplates =
    [
        "homepage",
        "product_listing",
        "product_detail",
        "cart",
        "static_page",
        "checkout"
    ];

    private static readonly HashSet<string> MandatoryHooks = new(StringComparer.OrdinalIgnoreCase)
    {
        "BeforePrice",
        "AfterPrice",
        "BeforeAddToCart",
        "AfterDescription"
    };

    public bool Validate(string templatesJson, string sectionSchemasJson, string hookPointsJson, out string error)
    {
        error = string.Empty;
        try
        {
            var templates = ParseStringSet(templatesJson);
            foreach (var required in MandatoryTemplates)
            {
                if (!templates.Contains(required))
                {
                    error = $"missing_template_{required}";
                    return false;
                }
            }

            var hooks = ParseStringSet(hookPointsJson);
            foreach (var requiredHook in MandatoryHooks)
            {
                if (!hooks.Contains(requiredHook))
                {
                    error = $"missing_hook_{requiredHook}";
                    return false;
                }
            }

            using var doc = JsonDocument.Parse(sectionSchemasJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Array)
            {
                error = "section_schemas_must_be_array";
                return false;
            }
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object)
                {
                    error = "section_schema_item_invalid";
                    return false;
                }
                var name = item.TryGetProperty("name", out var nameEl) ? nameEl.GetString() : null;
                var fields = item.TryGetProperty("fields", out var fieldsEl) ? fieldsEl : default;
                if (string.IsNullOrWhiteSpace(name) || fields.ValueKind != JsonValueKind.Array)
                {
                    error = "section_schema_missing_name_or_fields";
                    return false;
                }
                foreach (var field in fields.EnumerateArray())
                {
                    if (field.ValueKind != JsonValueKind.Object)
                    {
                        error = "section_field_invalid";
                        return false;
                    }
                    var key = field.TryGetProperty("key", out var keyEl) ? keyEl.GetString() : null;
                    var type = field.TryGetProperty("type", out var typeEl) ? typeEl.GetString() : null;
                    if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(type))
                    {
                        error = "section_field_missing_key_or_type";
                        return false;
                    }
                    if (key.Contains("html", StringComparison.OrdinalIgnoreCase))
                    {
                        error = "raw_html_fields_not_allowed";
                        return false;
                    }
                }
            }
        }
        catch
        {
            error = "theme_contract_json_invalid";
            return false;
        }

        return true;
    }

    private static HashSet<string> ParseStringSet(string json)
    {
        using var doc = JsonDocument.Parse(json);
        if (doc.RootElement.ValueKind != JsonValueKind.Array) return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var x in doc.RootElement.EnumerateArray())
        {
            if (x.ValueKind == JsonValueKind.String)
            {
                var v = x.GetString();
                if (!string.IsNullOrWhiteSpace(v)) set.Add(v.Trim());
            }
        }
        return set;
    }
}
