// Переиспользуемый компонент для вставки JSON-LD структурированных данных.
// Используется на главной, странице аниме, странице главы, в /community.
// Schema.org даёт поисковикам подсказки: что это за страница, кто автор,
// какой контент. Влияет на rich snippets в выдаче Яндекс/Google.
//
// Замечание: dangerouslySetInnerHTML здесь безопасен, потому что
// data приходит только из серверного кода (никогда из user input).

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
