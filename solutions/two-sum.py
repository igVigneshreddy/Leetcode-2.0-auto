# LeetCode Problem: Two Sum
# Difficulty: Medium
# Language: Python3
# URL: https://leetcode.com/problems/two-sum/

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Create a hash map to store numbers and their indices
        # The key will be the number, and the value will be its index in the nums array
        num_map = {}

        # Iterate through the array with both index and value
        for i, num in enumerate(nums):
            # Calculate the complement needed to reach the target
            complement = target - num

            # Check if the complement already exists in our hash map
            if complement in num_map:
                # If it does, we found the two numbers.
                # Return the index of the complement and the current number's index.
                return [num_map[complement], i]
            
            # If the complement is not found, add the current number and its index to the hash map.
            # This prepares the map for future iterations where 'num' might be a complement.
            num_map[num] = i
class Solution:
