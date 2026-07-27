import math

class Solution:
    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:
        m, n = len(nums1), len(nums2)
        if m > n:
            nums1, nums2 = nums2, nums1
            m, n = n, m

        low, high = 0, m
        total_len = m + n
        half_len = (total_len + 1) // 2

        while low <= high:
            i = (low + high) // 2
            j = half_len - i

            max_left_nums1 = -math.inf if i == 0 else nums1[i-1]
            min_right_nums1 = math.inf if i == m else nums1[i]

import math