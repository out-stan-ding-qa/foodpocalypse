@authenticated
Feature: Product Rating
  As a User
  I cycle a Rating on Product detail
  So my judgment overrides any Recommendation

  Scenario: User cycles Rating green to blank on Product detail
    Given an API-seeded Product with an active Diet profile and a green Rating
    When I open that Product detail
    Then I see a green Rating bubble for the Diet profile
    When I tap the Rating bubble
    Then I see a yellow Rating bubble for the Diet profile
    When I tap the Rating bubble
    Then I see a red Rating bubble for the Diet profile
    When I tap the Rating bubble
    Then I see no Rating bubble for the Diet profile
    And I see the Add Rating chip for the Diet profile
