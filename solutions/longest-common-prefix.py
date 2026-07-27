import math
from typing import List

class Solution:
    def longestCommonPrefix(self, strs: List[str]) -> str:
        if not strs:
            return ""

        # The longest common prefix cannot be longer than the shortest string in the array.
        # Find the length of the shortest string.
        min_len = math.inf
        for s in strs:
            min_len = min(min_len, len(s))
        
        if min_len == 0:
            return ""

        # Initialize the common prefix to be empty.
        common_prefix = ""

import math