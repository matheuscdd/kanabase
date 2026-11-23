import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
EPISODES_FILE = BASE_DIR / "episodes.json"
SECTIONS_FILE = BASE_DIR / "sections.json"


def number(value, default=0):
    """Convert JSON numeric values safely without losing integer/float behavior."""
    if isinstance(value, (int, float)):
        return value
    try:
        return int(value)
    except (TypeError, ValueError):
        try:
            return float(value)
        except (TypeError, ValueError):
            return default


def main():
    with SECTIONS_FILE.open("r", encoding="utf-8") as file:
        sections = json.load(file)

    with EPISODES_FILE.open("r", encoding="utf-8") as file:
        episodes = json.load(file)

    # Sections can share names/IDs across podcasts, so keep the section order
    # keyed by both podcastId and sectionId.
    section_order = {
        (section.get("podcastId"), section.get("id")): number(section.get("order"), 0)
        for section in sections
    }

    def sort_key(episode):
        podcast_id = str(episode.get("podcastId") or "")
        section_id = episode.get("sectionId")
        section_position = section_order.get(
            (episode.get("podcastId"), section_id),
            float("inf"),
        )
        episode_position = number(episode.get("order"), 0)
        episode_id = str(episode.get("id") or "")
        return podcast_id, section_position, episode_position, episode_id

    episodes.sort(key=sort_key)

    with EPISODES_FILE.open("w", encoding="utf-8") as file:
        json.dump(episodes, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print(f"Ordenados {len(episodes)} episódios em {EPISODES_FILE.name}")


if __name__ == "__main__":
    main()
