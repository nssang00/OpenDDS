using System;
using System.Collections.Generic;

namespace EAtoIDL.Generator
{
    /// <summary>
    /// EA 원시 타입 이름 → OMG IDL 4.x 타입 이름 변환 테이블.
    /// 미등록 타입은 그대로 반환(커스텀 타입으로 간주).
    /// </summary>
    public static class TypeMapper
    {
        // ── EA → IDL 원시 타입 매핑 ────────────────────────────────────────

        private static readonly Dictionary<string, string> _map =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            // 정수
            { "byte",           "octet"              },
            { "octet",          "octet"              },
            { "int8",           "int8"               },   // IDL 4.2 확장
            { "uint8",          "uint8"              },
            { "short",          "short"              },
            { "int16",          "short"              },
            { "ushort",         "unsigned short"     },
            { "uint16",         "unsigned short"     },
            { "int",            "long"               },
            { "int32",          "long"               },
            { "integer",        "long"               },
            { "long",           "long"               },
            { "uint",           "unsigned long"      },
            { "uint32",         "unsigned long"      },
            { "ulong",          "unsigned long"      },
            { "int64",          "long long"          },
            { "longlong",       "long long"          },
            { "uint64",         "unsigned long long" },
            { "ulonglong",      "unsigned long long" },

            // 부동소수점
            { "float",          "float"              },
            { "single",         "float"              },
            { "double",         "double"             },
            { "longdouble",     "long double"        },
            { "real",           "double"             },

            // 논리
            { "bool",           "boolean"            },
            { "boolean",        "boolean"            },

            // 문자
            { "char",           "char"               },
            { "wchar",          "wchar"              },
            { "wchar_t",        "wchar"              },

            // 문자열
            { "string",         "string"             },
            { "wstring",        "wstring"            },
            { "ansistring",     "string"             },

            // 기타
            { "void",           "void"               },
            { "any",            "any"                },
        };

        // ── 공개 API ────────────────────────────────────────────────────────

        /// <summary>EA 타입 이름을 IDL 원시 타입으로 변환. 미등록이면 원본 반환.</summary>
        public static string Map(string eaType)
        {
            if (string.IsNullOrWhiteSpace(eaType)) return "octet";
            string idl;
            return _map.TryGetValue(eaType.Trim(), out idl) ? idl : eaType.Trim();
        }

        /// <summary>등록된 원시 타입인지 여부.</summary>
        public static bool IsPrimitive(string eaType) =>
            !string.IsNullOrWhiteSpace(eaType) && _map.ContainsKey(eaType.Trim());
    }
}
