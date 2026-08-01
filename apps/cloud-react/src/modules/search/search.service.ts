import { searchApi } from "./search.api"

export const searchService = {
    search: (query: string) => searchApi.search(query),
}
