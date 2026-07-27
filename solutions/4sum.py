class Solution:
    def fourSum(self, nums: List[int], target: int) -> List[List[int]]:
        nums.sort()
        n = len(nums)
        res = []

        for i in range(n - 3):
            if i > 0 and nums[i] == nums[i-1]:
                continue
            
            # Optimization: Check if remaining elements can form the sum
            if nums[i] + nums[i+1] + nums[i+2] + nums[i+3] > target: # Minimum possible sum using nums[i] and next three 
            elements
                break 
            if nums[i] + nums[n-3] + nums[n-2] + nums[n-1] < target: # Maximum possible sum using nums[i] and last three 
            elements
                continue

            for j in range(i + 1, n - 2):
                if j > i + 1 and nums[j] == nums[j-1]:
class Solution: